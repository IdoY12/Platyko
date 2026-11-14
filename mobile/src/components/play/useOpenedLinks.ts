import { useEffect } from "react";
import { Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { parseAppLink } from "@/config/appLinks";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { linkOpened } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { playRequest } from "./playRequest";

/** The link that launched the app is read once per run, not again when the navigator remounts. */
let launchLinkRead = false;

/**
 * Room and friend links (PRD 11.1, 11.7, criterion 20.4). A guest is sent to sign in first and the
 * link waits; once signed in and connected, a room link joins the lobby and opens the Play tab,
 * and a friend link opens Friends with the code filled in. Nobody types the code again.
 */
export function useOpenedLinks(): void {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<RootNavigation>();
  const pendingLink = useAppSelector((state) => state.play.pendingLink);
  const isAuthenticated = useAppSelector((state) => state.session.isAuthenticated);
  const connected = useAppSelector((state) => state.play.connected);

  useEffect(() => {
    const open = (url: string | null) => url && dispatch(linkOpened(parseAppLink(url)));
    if (!launchLinkRead) {
      launchLinkRead = true;
      void Linking.getInitialURL().then(open);
    }
    const subscription = Linking.addEventListener("url", ({ url }) => open(url));
    return () => subscription.remove();
  }, [dispatch]);

  useEffect(() => {
    if (!pendingLink) return;
    if (!isAuthenticated) {
      navigation.navigate("Auth");
      return;
    }
    if (pendingLink.kind === "friend") {
      dispatch(linkOpened(null));
      navigation.navigate("Friends", { friendCode: pendingLink.code });
      return;
    }
    if (!connected) return;
    dispatch(linkOpened(null));
    void playRequest(() => playService.joinRoom(pendingLink.code)).then((reply) => reply && navigation.navigate("MainTabs", { screen: "PlayTab" }));
  }, [pendingLink, isAuthenticated, connected, navigation, dispatch]);
}
