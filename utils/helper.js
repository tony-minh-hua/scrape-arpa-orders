function getCleanFilename(i, counter, fileType) {
  const filename = `file${i}-${counter}.${fileType}`;
  return filename;
}

module.exports = {
  getCleanFilename,
};
