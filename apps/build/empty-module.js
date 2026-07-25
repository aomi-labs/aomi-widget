// Empty module stub for optional dependencies like 'porto'
// This prevents build errors when optional peer dependencies aren't installed

module.exports = {
  Porto: {
    create: () => Promise.reject(new Error("Porto connector not available")),
  },
};
