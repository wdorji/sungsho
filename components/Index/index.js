import { useState } from "react";
import styles from "../../styles/Pages.module.css";
import { Switch, FormControl, FormLabel, Button } from "@chakra-ui/react";

export default function Index({ navigateToPage }) {
  const [switchState, setSwitchState] = useState(false);
  const processPage = async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "convert",
        token: apiToken,
        dzo: switchState,
      });
    });
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <FormControl display="flex" alignItems="center" justifyContent="center">
          <FormLabel mb="0">བོད་སྐད།</FormLabel>
          <Switch
            colorScheme="orange"
            isChecked={switchState}
            onChange={() => setSwitchState(!switchState)}
          />
          <FormLabel mb="0" marginLeft={3}>
            རྫོང་ཁ།
          </FormLabel>
        </FormControl>

        <Button
          colorScheme="gray"
          size="sm"
          marginTop={25}
          onClick={() => processPage()}
        >
          Read Page
        </Button>
      </main>
    </div>
  );
}
