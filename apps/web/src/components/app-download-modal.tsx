"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { create } from "zustand";
import { modalCloseEvent } from "~/libs/clarity";
import {
  ModalStatusStore,
  getModalStatusStore,
} from "~/libs/store/modal-status";
import { cn } from "~/libs/utils";
import { getModalAnimationClassNames } from "~/styles/utils";
import DimmedBackground from "./ui/dimmed-background";
import { onAppDownloadClick } from "~/libs/app-download-click";

export const useAppDownloadModalStore =
  create<ModalStatusStore>(getModalStatusStore);

export default function AppDownloadModal() {
  const { status, close, transferStatus } = useAppDownloadModalStore();
  const router = useRouter();

  const onClickDownloadApp = () => {
    close();
    onAppDownloadClick(router.push);
  };

  const onClickClose = (isButtonClick: boolean) => {
    close();
    modalCloseEvent(isButtonClick);
  };

  if (status === "unmounted") {
    return null;
  }

  return (
    <>
      {createPortal(
        <RemoveScroll removeScrollBar={false}>
          <DimmedBackground
            classNames={getModalAnimationClassNames(status)}
            onClose={() => onClickClose(false)}
          />
          <div
            className={cn(
              getModalAnimationClassNames(status),
              "z-[1000] bg-white fixed -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 w-[272px] overflow-hidden rounded-[8px] p-4 pt-[21px] text-[16px] leading-[22px]",
            )}
            onAnimationEnd={transferStatus}
          >
            <p className="text-black font-semibold text-center">
              앱 설치하고
              <br />
              글귀를 공유하세요
            </p>
            <div className="mt-4 flex flex-col gap-0.5">
              <button
                type="button"
                className="flex items-center justify-center w-full h-10 rounded-[8px] overflow-hidden font-semibold text-white bg-[#FF7900]"
                onClick={onClickDownloadApp}
              >
                앱 설치하기
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-full h-10 rounded-[8px] overflow-hidden"
                onClick={() => onClickClose(true)}
              >
                닫기
              </button>
            </div>
          </div>
        </RemoveScroll>,
        document.body,
      )}
    </>
  );
}
