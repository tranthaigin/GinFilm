export const fetchM3u8Duration = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch m3u8: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('video/') && !contentType.includes('mpegurl')) {
      // It's likely a direct video file (like mp4), don't download the whole thing
      return 0;
    }

    const text = await response.text();
    
    // Tìm tất cả các thẻ #EXTINF:
    const regex = /#EXTINF:([\d.]+),/g;
    let match;
    let totalSeconds = 0;
    
    while ((match = regex.exec(text)) !== null) {
      totalSeconds += parseFloat(match[1]);
    }
    
    return totalSeconds;
  } catch (error) {
    console.error("Error fetching m3u8 duration:", error);
    return 0;
  }
};
