function escapeMarkdown(string: string) {
  return string.replace(/([*_`~#\\])/g, "\\$1");
}

export {
  escapeMarkdown,
};
