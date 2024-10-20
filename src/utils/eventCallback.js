function enterCallback(callback) {
  return (e) => {
    if (e.keyCode == 13) {
      callback(e);
    }
  };
}

export { enterCallback };
