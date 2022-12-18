export async function $(element: any, selector: string) {
  await waitForSelector(element, selector);
  return element.$(selector);
}

export async function $$(element: any, selector: string) {
  await waitForSelector(element, selector);
  return element.$$(selector);
}

export async function $eval(
  element: any,
  selector: string,
  callback: any,
  params = {} as any,
) {
  return _genericEval("$eval", element, selector, callback, params);
}

export async function $$eval(
  element: any,
  selector: string,
  callback: any,
  params = {} as any,
) {
  return _genericEval("$$eval", element, selector, callback, params);
}

export async function _genericEval(
  method: string,
  element: any,
  selector: string,
  callback: any,
  params = {} as any,
) {
  await waitForSelector(element, selector);
  return element[method](selector, callback, params);
}

export async function waitForSelector(element: any, selector: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await element.waitForSelector(selector, {
        timeout: 1500,
      });
      return;
    } catch (e) {
      await new Promise((resolve: any) => setTimeout(resolve, 1500));
    }
  }
}
