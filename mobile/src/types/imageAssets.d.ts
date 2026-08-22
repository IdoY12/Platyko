// Types static image imports (Metro bundles them as native image sources).
declare module "*.png" {
  import type { ImageSourcePropType } from "react-native";
  const source: ImageSourcePropType;
  export default source;
}
