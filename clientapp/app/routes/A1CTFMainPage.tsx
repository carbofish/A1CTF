import PageHeader from "components/A1Headers";
import A1Footer from "components/A1Footer";
import { useCallback, useEffect, useRef } from "react";
import { useSpring, animated } from '@react-spring/web';
import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import { useTheme } from "next-themes";

export default function A1CTFMainPage() {

  const { clientConfig } = useGlobalVariableContext();
  const { theme, systemTheme } = useTheme();
  const imgRef = useRef<HTMLImageElement>(new Image());

  useEffect(() => {
    if (clientConfig.gameActivityMode) {

      window.location.href = `/games/${clientConfig.gameActivityMode}/info`;
    }
  }, [clientConfig]);

  const pickIconSrc = useCallback((): string | null => {
    if (!clientConfig) return null;
    const white = clientConfig.SVGIconDark;
    const black = clientConfig.SVGIconLight;
    if (!white || !black) return null;

    if (theme === "system") {
      return systemTheme === "dark" ? white : black;
    }
    return theme === "light" ? black : white;
  }, [theme, systemTheme, clientConfig]);

  const styles = useSpring({
    from: { transform: 'scaleX(0)' },
    to: { transform: 'scaleX(1)' },
    config: { tension: 300, friction: 30 },
  });

  useEffect(() => {
    imgRef.current.src = pickIconSrc() || "";
  }, [pickIconSrc])

  return (
    <>
      <div className="p-0 h-screen flex flex-col">
        <PageHeader />
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center">
          <animated.div
            style={{ ...styles, transformOrigin: 'left' }}
            className="mb-20 select-none flex gap-6"
          >
            <img
              ref={imgRef}
              alt="A1CTF"
              className="
                w-24 h-24
                sm:w-32 sm:h-32
                md:w-40 md:h-40
                lg:w-52 lg:h-52
                xl:w-64 xl:h-64
                object-cover rounded-xl
              "
              // style={{ transformOrigin: 'center' }}
            />

            <div
              className="flex flex-col justify-end text-right"
              // style={{ transformOrigin: 'center' }}
            >
              <span
                className="
                  text-lg sm:text-lg md:text-2xl lg:text-3xl
                  text-foreground/60 leading-none mb-1
                "
              >
                Welcome to
              </span>

              <span
                className="
                  text-5xl sm:text-6xl md:text-7xl lg:text-8xl
                  font-extrabold leading-none tracking-tight
                "
              >
                {clientConfig.systemName || "A1CTF"}
              </span>
            </div>

          </animated.div>
        </div>
        <A1Footer />
      </div>
    </>
  );
}
