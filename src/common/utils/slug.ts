// Tạo slug từ tiêu đề (hỗ trợ bỏ dấu tiếng Việt).
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu thanh
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Thêm hậu tố ngẫu nhiên ngắn để tránh trùng slug.
export function uniqueSlug(input: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slugify(input)}-${suffix}`;
}
