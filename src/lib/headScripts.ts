// Tiny scripts that run in <head> before the page paints, so the saved
// theme and text size show at once. Kept out of "use client" files so the
// server gets the real strings.

export const THEME_KEY = "railassist-theme";
export const SIZE_KEY = "railassist-text-size";

export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})();`;

// Text size is fixed at A+ (115%): there is no size button any more.
export const textSizeScript = `document.documentElement.dataset.size="2";`;
