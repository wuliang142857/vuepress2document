declare module '*.jpg';
declare module '*.png';
declare module '*.json';
declare module '*.svg' {
  export function ReactComponent(props: React.SVGProps<SVGSVGElement>): React.ReactElement
  const url: string
  export default url
}
