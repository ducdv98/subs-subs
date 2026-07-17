export function isWatchUrl(url) {
    if (!url)
        return false;
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return false;
    }
    return (parsed.protocol === "https:" &&
        parsed.hostname === "www.youtube.com" &&
        parsed.pathname === "/watch");
}
