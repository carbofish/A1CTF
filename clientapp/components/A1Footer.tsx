import { Box, GitPullRequestArrow, Mail } from 'lucide-react'
import { useState } from "react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu"

import { A1CTF_NAME, A1CTF_VERSION } from "version";

import { useGlobalVariableContext } from "contexts/GlobalVariableContext";
import { useNavigate } from "react-router";

const A1Footer = () => {

    const [infoViewShow, setInfoViewShow] = useState(false)

    const router = useNavigate()

    const { clientConfig, getSystemLogo } = useGlobalVariableContext()

    return (
        <>
            <footer className="h-16 flex justify-center items-center font-bold text-sm lg:text-base select-none">
                <Box className="hidden md:block" />
                <span className="ml-2 hidden md:block">{clientConfig.systemFooter}</span>
                {/* <span className="ml-2 md:hidden">A1CTF</span> */}
                {clientConfig.systemICP ? (
                    <>
                        <span className="ml-2 mr-2 hidden md:block">/</span>
                        <a className="hover:underline decoration-2 underline-offset-4 hidden md:block" onClick={() => {
                            window.open("http://beian.miit.gov.cn/")
                        }}>{clientConfig.systemICP}</a>
                    </>
                ) : <></>}
                {clientConfig.systemOrganizationURL ? (
                    <>
                        <span className="ml-2 mr-2 hidden md:block">/</span>
                        <a className="hover:underline decoration-2 underline-offset-4 hidden md:block" onClick={() => {
                            window.open(clientConfig.systemOrganizationURL)
                        }}>{clientConfig.systemOrganization}</a>
                    </>
                ) : <></>}
                <div className='flex gap-2 items-center md:hidden'>
                    <img
                        src={getSystemLogo()}
                        alt={clientConfig.SVGAltData}
                        width={28}
                        height={28}
                    />
                    <span className='font-bold text-lg'>{clientConfig.systemName}</span>
                </div>
                <span className="ml-2 mr-2">/</span>
                <DropdownMenu open={infoViewShow} modal={false}>
                    <DropdownMenuTrigger asChild>
                        <div className="p-2 rounded-[8px] transition-[background] duration-300 hover:bg-foreground/10"
                            onClick={() => {
                                setInfoViewShow(!infoViewShow)
                            }}
                        >
                            <GitPullRequestArrow size={22} />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="mb-2 mr-4 md:mr-0 backdrop-blur-md bg-transparent">
                        <div className="flex flex-col pt-1 pb-2 pl-2 pr-2 select-none">
                            <div className="flex items-center justify-center pt-1 pb-1 pl-4 pr-4 gap-4 hover:bg-foreground/10 rounded-md transition-[background] duration-300"
                                onClick={() => {
                                    setInfoViewShow(false)
                                    router(`/version`)
                                }}
                            >
                                <img
                                    src={getSystemLogo()}
                                    alt={clientConfig.SVGAltData}
                                    width={34}
                                    height={34}
                                />
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold">{A1CTF_NAME}</span>
                                    <span className="text-sm mt-[-8px] text-orange-500">{A1CTF_VERSION}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 text-sm items-center mt-1 justify-center">
                                <Mail size={20} />
                                <span>carbofish@hotmail.com</span>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                {/* transition-none duration-200 ease-in-out  */}
            </footer>
        </>
    )
}

export default A1Footer;