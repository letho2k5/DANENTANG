import { Redirect } from "expo-router";

export default function Index() {
  // TODO: check auth state, rồi redirect phù hợp
  return <Redirect href="/(auth)/login" />;
}
