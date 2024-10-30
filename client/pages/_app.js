import "@/styles/globals.scss";
import ThemeContext from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";
import Script from "next/script";
function MyApp({ Component, pageProps }) {
  
  const [theme, setTheme] = useState('default');

  useEffect(() => {

    const savedTheme = localStorage.getItem('liminallounge:theme');
    if (savedTheme) {
      if(savedTheme !== theme) {
        setTheme(savedTheme);
      }
    } else {
      setTheme('light');
    }

  }, [theme]);

  return (
    <ThemeContext.Provider value={{theme, setTheme}}>
      <div className={`theme-parent theme-${theme}`}>
        <Script defer src="https://umami.ovel.sh/script.js" data-website-id="ac7bd3b1-5262-4a30-8f45-5cf1906e5dbb"></Script>
        <Component {...pageProps} />
      </div>
    </ThemeContext.Provider>
  )
}

export default MyApp;
