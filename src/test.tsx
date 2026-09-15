export function el(tag: string, args: any, ...children: string[]) {
  if (typeof tag == "function")
    return children.join('')
  return `<${tag}${Object.entries(args).map(([a, b]) => ` ${a}="${b}"`)}>${children.join('')}</${tag}>`;
}


export function testTcx() {
  return <div foo="bar">Test</div>
}