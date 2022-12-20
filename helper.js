export async function $(element, selector) {
  await waitForSelector(element, selector);
  return element.$(selector);
}

export async function $$(element, selector) {
  await waitForSelector(element, selector);
  return element.$$(selector);
}

export async function $eval(
  element,
  selector,
  callback,
  params = {},
) {
  return _genericEval("$eval", element, selector, callback, params);
}

export async function $$eval(
  element,
  selector,
  callback,
  params = {},
) {
  return _genericEval("$$eval", element, selector, callback, params);
}

export async function _genericEval(
  method,
  element,
  selector,
  callback,
  params = {},
) {
  await waitForSelector(element, selector);
  return element[method](selector, callback, params);
}

export async function waitForSelector(element, selector) {
  for (let i = 0; i < 3; i++) {
    try {
      await element.waitForSelector(selector, {
        timeout: 1500,
      });
      return;
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}
