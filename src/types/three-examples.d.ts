declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import { Camera, EventDispatcher } from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  export { OrbitControls };
  export default class OrbitControlsImpl extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement);
  }
}
