/**
 * 工具方法 在 applyMiddleware 中使用
 * 将多个函数合并成一个函数，嵌套执行
 * compose(f, g, h): f(g(h())) 函数的执行顺序从右到左，h() g() f()，
 * 上一个函数的返回值作为下个函数的参数。
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  /**
   * 核心语句就是这一句reduce，队列中的下一个函数b，已组合的函数a，把b作为参数扔给a，
   * 如此反复直至循环完毕。
   */
  const last = funcs[funcs.length - 1]
  const rest = funcs.slice(0, -1)
  return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args))
}
