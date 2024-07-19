import Footer from "../components/Footer";
import Header from "../components/Header";
import { ChakraProvider } from "@chakra-ui/react";
import ToastProvider from "./toastProvider";
import "../styles/globals.css";
export default function App({ Component, pageProps }) {
  return (
    <>
      <ChakraProvider>
        <ToastProvider />
        <Component {...pageProps} />
      </ChakraProvider>
    </>
  );
}
