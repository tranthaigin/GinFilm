const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDINARY_IMAGE_UPLOAD_PATH = '/image/upload/';
const SAFE_CROP_MODES = new Set(['crop', 'fill', 'fit', 'limit', 'lfill', 'pad', 'scale', 'thumb']);
const SAFE_TOKEN_PATTERN = /^[a-z0-9:_-]+$/i;

const normalizeDimension = (value) => {
  const dimension = Number(value);
  return Number.isFinite(dimension) && dimension > 0 ? Math.round(dimension) : null;
};

const parseCloudinaryImageUrl = (src) => {
  if (typeof src !== 'string' || !src) return null;

  try {
    const url = new URL(src);
    const uploadIndex = url.pathname.indexOf(CLOUDINARY_IMAGE_UPLOAD_PATH);

    if (url.hostname.toLowerCase() !== CLOUDINARY_HOST || uploadIndex === -1) {
      return null;
    }

    const assetPath = url.pathname.slice(uploadIndex + CLOUDINARY_IMAGE_UPLOAD_PATH.length);

    // A signed delivery URL cannot be changed without recalculating its signature.
    if (!assetPath || assetPath.startsWith('s--')) return null;

    return { url, uploadIndex, assetPath };
  } catch {
    return null;
  }
};

export const isTransformableCloudinaryImage = (src) => Boolean(parseCloudinaryImageUrl(src));

export const getCloudinaryImageUrl = (src, options = {}) => {
  const parsed = parseCloudinaryImageUrl(src);
  if (!parsed) return src;

  const width = normalizeDimension(options.width);
  const height = normalizeDimension(options.height);
  const crop = SAFE_CROP_MODES.has(options.crop) ? options.crop : (width && height ? 'fill' : 'limit');
  const gravity = typeof options.gravity === 'string' && SAFE_TOKEN_PATTERN.test(options.gravity)
    ? options.gravity
    : 'auto';
  const quality = typeof options.quality === 'string' && SAFE_TOKEN_PATTERN.test(options.quality)
    ? options.quality
    : 'auto';
  const format = typeof options.format === 'string' && SAFE_TOKEN_PATTERN.test(options.format)
    ? options.format
    : 'auto';

  const transformations = [`c_${crop}`];
  if (crop === 'fill' || crop === 'crop' || crop === 'thumb' || crop === 'lfill') {
    transformations.push(`g_${gravity}`);
  }
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`f_${format}`, `q_${quality}`);

  const uploadEnd = parsed.uploadIndex + CLOUDINARY_IMAGE_UPLOAD_PATH.length;
  parsed.url.pathname = `${parsed.url.pathname.slice(0, uploadEnd)}${transformations.join(',')}/${parsed.assetPath}`;
  return parsed.url.toString();
};

export const getCloudinaryImageSrcSet = (src, widths, options = {}) => {
  if (!parseCloudinaryImageUrl(src) || !Array.isArray(widths)) return undefined;

  const uniqueWidths = [...new Set(widths.map(normalizeDimension).filter(Boolean))].sort((a, b) => a - b);
  if (uniqueWidths.length === 0) return undefined;

  const aspectRatio = Number(options.aspectRatio);
  const hasAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0;

  return uniqueWidths
    .map((width) => {
      const height = hasAspectRatio ? Math.round(width / aspectRatio) : options.height;
      return `${getCloudinaryImageUrl(src, { ...options, width, height })} ${width}w`;
    })
    .join(', ');
};
