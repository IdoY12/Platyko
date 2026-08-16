import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainTabParamList } from "./mainTab.types";
import type { RootStackParamList } from "./rootNavigation.types";

export type HomeStackParamList = {
  HomeMain: undefined;
  CodePuzzle: undefined;
};

/** Composite includes the root stack so guest screens can `navigate("Auth")` (action bubbles up). */
type HomeScreenProps<RouteName extends keyof HomeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, RouteName>,
  CompositeScreenProps<BottomTabScreenProps<MainTabParamList>, NativeStackScreenProps<RootStackParamList>>
>;

export type HomeMainScreenProps = HomeScreenProps<"HomeMain">;

export type CodePuzzleScreenProps = HomeScreenProps<"CodePuzzle">;
