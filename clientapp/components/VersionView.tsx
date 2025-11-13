import { Link } from "lucide-react"

import { A1CTF_NAME, A1CTF_VERSION, BUILD_TIME } from "version";

export function VersionView() {

    return (
        <div className="w-full h-full flex items-center justify-center select-none">
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center pt-1 pb-1 pl-4 pr-4 gap-6 mb-10">
                    <img
                        className="dark:invert"
                        src="http://assets.carbo.ink/A1natas.svg"
                        alt="A1natas"
                        width={70}
                        height={70}
                    />
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold">{ A1CTF_NAME }</span>
                        <span className="text-xl mt-[-8px] text-orange-500">{ A1CTF_VERSION }</span>
                    </div>
                </div>
                <div className="flex gap-4 items-center scale-75 sm:scale-100">
                    <span className="text-lg">Developer: </span>
                    <div className="flex gap-1 items-center pt-1 pb-1 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                        <Link size={20} />
                        <span className="text-lg"
                            onClick={() => {
                                window.open('https://github.com/carbofish')
                            }}
                        >carbofish</span>
                    </div>
                    <div className="flex gap-1 items-center pt-1 pb-1 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                        <Link size={20} />
                        <span className="text-lg"
                            onClick={() => {
                                window.open('https://github.com/carbofish/A1CTF')
                            }}
                        >A1CTF 🌟</span>
                    </div>
                </div>
                <span className="text-lg mt-5 text-red-400">💖Thanks</span>
                <div className="flex gap-2 mt-1 scale-75 sm:scale-100">
                    <div className="flex gap-4 items-center">
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                                onClick={() => {
                                    window.open('https://github.com/Reverier-Xu')
                                }}
                            >R2S & Reverier-Xu</span>
                        </div>
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                                onClick={() => {
                                    window.open('https://github.com/GZTimeWalker/GZCTF')
                                }}
                            >GZCTF & GZTime</span>
                        </div>
                    </div>
                </div>
                <span className="text-lg mt-5 text-blue-500">⚙️Technologies</span>
                <div className="flex gap-2 mt-1 scale-75 sm:scale-100">
                    <div className="flex gap-4 items-center">
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                                onClick={() => {
                                    window.open('https://github.com/facebook/react')
                                }}
                            >React</span>
                        </div>
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                                onClick={() => {
                                    window.open('https://github.com/shadcn-ui/ui')
                                }}
                            >Shadcn UI</span>
                        </div>
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                                onClick={() => {
                                    window.open('https://vite.dev/')
                                }}
                            >Vite</span>
                        </div>
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                                onClick={() => {
                                    window.open('https://github.com/lucide-icons/lucide')
                                }}
                            >Lucide icons</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-1 scale-75 sm:scale-100">
                    <div className="flex gap-4 items-center">
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                                onClick={() => {
                                    window.open('https://www.typescriptlang.org/')
                                }}
                            >TypeScript</span>
                        </div>
                        <div className="flex gap-2 items-center pt-2 pb-2 pl-3 pr-3 hover:bg-foreground/10 rounded-md transiiton-[background] duration-300">
                            <Link size={20} />
                            <span className="text-md" 
                            >More...</span>
                        </div>
                    </div>
                </div>
                <div className="flex mt-8 scale-75 sm:scale-100">
                    <span className="text-md font-bold">这是一个处于开发阶段的萌新项目, 有问题请多多指正 :)</span>
                </div>
                <span className="text-xs sm:text-lg mt-2">{ `Build time ${BUILD_TIME}` }</span>
            </div>
        </div>
    )
}