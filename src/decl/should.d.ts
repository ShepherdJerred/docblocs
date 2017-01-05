interface ShouldAssertion {
  eventually: ShouldAssertion;
  throw(message?: any, properties?: Object): any;
}
