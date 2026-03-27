//! Native screen capture using platform APIs.
//! macOS: CoreGraphics CGWindowListCreateImage
//! Other platforms: not yet supported.

/// Encode bytes to base64 (no external dependency).
pub fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        result.push(TABLE[((n >> 18) & 0x3F) as usize] as char);
        result.push(TABLE[((n >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(TABLE[((n >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(TABLE[(n & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

// ── macOS implementation ────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
pub mod platform {
    use std::ffi::c_void;

    // --- CoreGraphics types ---

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGPoint {
        x: f64,
        y: f64,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGSize {
        width: f64,
        height: f64,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGRect {
        origin: CGPoint,
        size: CGSize,
    }

    // --- CoreGraphics FFI ---

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGWindowListCopyWindowInfo(option: u32, relativeToWindow: u32) -> *const c_void;
        fn CGWindowListCreateImage(
            screenBounds: CGRect,
            listOption: u32,
            windowID: u32,
            imageOption: u32,
        ) -> *const c_void;
    }

    // Window info dictionary key constants (extern from CoreGraphics)
    extern "C" {
        static kCGWindowOwnerPID: *const c_void;
        static kCGWindowNumber: *const c_void;
        static kCGWindowLayer: *const c_void;
    }

    // --- CoreFoundation FFI ---

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFArrayGetCount(theArray: *const c_void) -> isize;
        fn CFArrayGetValueAtIndex(theArray: *const c_void, idx: isize) -> *const c_void;
        fn CFDictionaryGetValue(theDict: *const c_void, key: *const c_void) -> *const c_void;
        fn CFNumberGetValue(number: *const c_void, theType: u32, valuePtr: *mut c_void) -> bool;
        fn CFRelease(cf: *const c_void);
        fn CFStringCreateWithCString(
            alloc: *const c_void,
            c_str: *const u8,
            encoding: u32,
        ) -> *const c_void;
        fn CFDataCreateMutable(allocator: *const c_void, capacity: isize) -> *mut c_void;
        fn CFDataGetBytePtr(theData: *const c_void) -> *const u8;
        fn CFDataGetLength(theData: *const c_void) -> isize;
    }

    // --- ImageIO FFI ---

    #[link(name = "ImageIO", kind = "framework")]
    extern "C" {
        fn CGImageDestinationCreateWithData(
            data: *mut c_void,
            r#type: *const c_void,
            count: usize,
            options: *const c_void,
        ) -> *mut c_void;
        fn CGImageDestinationAddImage(
            idst: *mut c_void,
            image: *const c_void,
            properties: *const c_void,
        );
        fn CGImageDestinationFinalize(idst: *mut c_void) -> bool;
    }

    // --- Constants ---

    const KCG_WINDOW_LIST_OPTION_ON_SCREEN_ONLY: u32 = 1 << 0;
    const KCG_WINDOW_LIST_OPTION_INCLUDING_WINDOW: u32 = 1 << 3;
    const KCG_WINDOW_IMAGE_BOUNDS_IGNORE_FRAMING: u32 = 1 << 0;
    const KCG_NULL_WINDOW_ID: u32 = 0;
    const KCF_NUMBER_SINT32_TYPE: u32 = 3;
    const KCF_STRING_ENCODING_UTF8: u32 = 0x08000100;

    /// Find the main window ID belonging to the given process ID.
    pub fn find_window_id(pid: u32) -> Result<u32, String> {
        unsafe {
            let windows = CGWindowListCopyWindowInfo(
                KCG_WINDOW_LIST_OPTION_ON_SCREEN_ONLY,
                KCG_NULL_WINDOW_ID,
            );
            if windows.is_null() {
                return Err("CGWindowListCopyWindowInfo returned null".into());
            }

            let count = CFArrayGetCount(windows);
            let mut result_wid: Option<u32> = None;

            for i in 0..count {
                let dict = CFArrayGetValueAtIndex(windows, i);
                if dict.is_null() {
                    continue;
                }

                // Check PID
                let pid_ref = CFDictionaryGetValue(dict, kCGWindowOwnerPID);
                if pid_ref.is_null() {
                    continue;
                }
                let mut owner_pid: i32 = 0;
                if !CFNumberGetValue(
                    pid_ref,
                    KCF_NUMBER_SINT32_TYPE,
                    &mut owner_pid as *mut i32 as *mut c_void,
                ) {
                    continue;
                }
                if owner_pid as u32 != pid {
                    continue;
                }

                // Layer 0 = normal window (skip menu bar, dock, etc.)
                let layer_ref = CFDictionaryGetValue(dict, kCGWindowLayer);
                if !layer_ref.is_null() {
                    let mut layer: i32 = -1;
                    CFNumberGetValue(
                        layer_ref,
                        KCF_NUMBER_SINT32_TYPE,
                        &mut layer as *mut i32 as *mut c_void,
                    );
                    if layer != 0 {
                        continue;
                    }
                }

                // Get window number
                let wid_ref = CFDictionaryGetValue(dict, kCGWindowNumber);
                if wid_ref.is_null() {
                    continue;
                }
                let mut wid: i32 = 0;
                if CFNumberGetValue(
                    wid_ref,
                    KCF_NUMBER_SINT32_TYPE,
                    &mut wid as *mut i32 as *mut c_void,
                ) {
                    result_wid = Some(wid as u32);
                    break;
                }
            }

            CFRelease(windows);
            result_wid.ok_or_else(|| format!("no on-screen window found for pid {}", pid))
        }
    }

    /// Capture a window by ID and return PNG bytes.
    pub fn capture_window_png(window_id: u32) -> Result<Vec<u8>, String> {
        unsafe {
            // CGRectNull = {{inf, inf}, {0, 0}} — captures the window's bounds
            let null_rect = CGRect {
                origin: CGPoint {
                    x: f64::INFINITY,
                    y: f64::INFINITY,
                },
                size: CGSize {
                    width: 0.0,
                    height: 0.0,
                },
            };

            let image = CGWindowListCreateImage(
                null_rect,
                KCG_WINDOW_LIST_OPTION_INCLUDING_WINDOW,
                window_id,
                KCG_WINDOW_IMAGE_BOUNDS_IGNORE_FRAMING,
            );
            if image.is_null() {
                return Err(format!(
                    "CGWindowListCreateImage failed for window {}",
                    window_id
                ));
            }

            // Create a mutable CFData to receive the PNG bytes
            let data = CFDataCreateMutable(std::ptr::null(), 0);
            if data.is_null() {
                CFRelease(image);
                return Err("CFDataCreateMutable failed".into());
            }

            // PNG UTI
            let png_uti = CFStringCreateWithCString(
                std::ptr::null(),
                b"public.png\0".as_ptr(),
                KCF_STRING_ENCODING_UTF8,
            );
            if png_uti.is_null() {
                CFRelease(image);
                CFRelease(data as *const c_void);
                return Err("failed to create PNG UTI string".into());
            }

            let dest = CGImageDestinationCreateWithData(data, png_uti, 1, std::ptr::null());
            CFRelease(png_uti);

            if dest.is_null() {
                CFRelease(image);
                CFRelease(data as *const c_void);
                return Err("CGImageDestinationCreateWithData failed".into());
            }

            CGImageDestinationAddImage(dest, image, std::ptr::null());
            let ok = CGImageDestinationFinalize(dest);

            CFRelease(image);
            CFRelease(dest as *const c_void);

            if !ok {
                CFRelease(data as *const c_void);
                return Err("CGImageDestinationFinalize failed".into());
            }

            let ptr = CFDataGetBytePtr(data as *const c_void);
            let len = CFDataGetLength(data as *const c_void) as usize;
            let bytes = std::slice::from_raw_parts(ptr, len).to_vec();
            CFRelease(data as *const c_void);

            Ok(bytes)
        }
    }

    /// Take a native screenshot of our process's main window.
    pub fn screenshot() -> Result<Vec<u8>, String> {
        let pid = std::process::id();
        let window_id = find_window_id(pid)?;
        eprintln!(
            "tauri-plugin-playwright: native screenshot pid={} window={}",
            pid, window_id
        );
        capture_window_png(window_id)
    }
}

// ── Fallback for non-macOS ──────────────────────────────────────────────────

#[cfg(not(target_os = "macos"))]
pub mod platform {
    pub fn screenshot() -> Result<Vec<u8>, String> {
        Err("native screenshot not yet supported on this platform".into())
    }
}
