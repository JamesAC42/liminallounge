import "@/styles/globals.scss";
import ThemeContext from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";

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
        <Component {...pageProps} />
      </div>
    </ThemeContext.Provider>
  )
}

export default MyApp;
