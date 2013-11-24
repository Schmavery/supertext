function filter(f, e, callback) {
  if(f(e) && callback)
    callback();
}
