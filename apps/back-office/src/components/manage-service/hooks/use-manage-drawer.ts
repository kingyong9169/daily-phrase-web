import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { create } from "zustand";
import { apis } from "~/apis";
import { queryClient } from "~/apis/config/tanstack-query/query-client";
import { queryKeys } from "~/apis/config/tanstack-query/query-keys";
import { PhraseItemWithId } from "~/types/phrase";
import { ManageValues, manageFormProps } from "../manage-drawer.meta";

export const useManageDrawer = create<{
  isBlocking: boolean;
  open: boolean;
  data?: PhraseItemWithId;
  setOpen: (open: boolean) => void;
  setBlocking: (isBlocking: boolean) => void;
  openNewDrawer: () => void;
  openEditDrawer: (data: PhraseItemWithId) => void;
  closeDrawer: () => void;
}>((set, get) => ({
  isBlocking: false,
  open: false,
  data: undefined,
  setOpen: (open) => {
    set({ open });
  },
  setBlocking: (isBlocking) => {
    set({ isBlocking });
  },
  openNewDrawer: () => {
    if (get().isBlocking) return;
    set({ open: true, data: undefined });
  },
  openEditDrawer: (data) => {
    if (get().isBlocking) return;
    set({ open: true, data });
  },
  closeDrawer: () => {
    if (get().isBlocking) return;
    set({ open: false });
  },
}));

export const useManageDrawerForm = () => {
  const form = useForm<ManageValues>(manageFormProps);

  const isDrawerOpen = useManageDrawer((v) => v.open);
  const defaultValues = useManageDrawer((v) => v.data);

  useEffect(() => {
    if (!isDrawerOpen) return;
    if (!defaultValues) {
      form.reset(manageFormProps.defaultValues);
      return;
    }
    const drawerValue = {
      title: defaultValues.title,
      isReserved: defaultValues.isReserved,
      publishDate: defaultValues.publishDate ? defaultValues.publishDate : "",
      content: defaultValues.content,
      imageList: defaultValues.imageUrl
        ? [
            {
              src: defaultValues.imageUrl,
              radio: defaultValues.imageRatio,
              filename: defaultValues.filename,
            },
          ]
        : [],
    } satisfies ManageValues;
    form.reset(drawerValue);
  }, [form, isDrawerOpen, defaultValues]);

  return { form };
};

export const useManageDrawerMutation = () => {
  const defaultValues = useManageDrawer((v) => v.data);
  const isBlocking = useManageDrawer((v) => v.isBlocking);
  const setBlocking = useManageDrawer((v) => v.setBlocking);
  const closeDrawer = useManageDrawer((v) => v.closeDrawer);
  const { mutate: update, isPending: isUpdatePending } = useMutation({
    mutationFn: (data: Parameters<typeof apis.phraseApi.updatePhrase>) =>
      apis.phraseApi.updatePhrase(...data),
  });
  const { mutate: create, isPending: isCreatePending } = useMutation({
    mutationFn: (...data: Parameters<typeof apis.phraseApi.createPhrase>) =>
      apis.phraseApi.createPhrase(...data),
  });
  const onSuccessCallback = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.phraseList });
    setBlocking(false);
    closeDrawer();
  };
  const getToBeSendData = (values: ManageValues) => ({
    title: values.title,
    content: values.content,
    imageUrl: values.imageList[0]?.src ?? "",
    imageRatio: values.imageList[0]?.radio ?? "",
    fileName: values.imageList[0]?.filename ?? "",
    fileSize: values.imageList[0]?.size ?? 0,
    isReserved: values.isReserved,
    publishDate:
      values.isReserved && values.publishDate
        ? format(values.publishDate, "yyyy-MM-dd")
        : "",
  });

  async function onSubmit(values: ManageValues) {
    if (isBlocking) {
      return;
    }

    setBlocking(true);

    try {
      const hasLocalImage = values.imageList.some((image) =>
        image.src.startsWith("data:"),
      );

      if (hasLocalImage) {
        toast.loading("이미지 업로드 중...");
        await Promise.all(
          values.imageList.map(async (blogImage, i) => {
            const res = await apis.phraseApi.uploadImage({
              src: blogImage.src,
              filename: blogImage.filename,
            });
            values.imageList[i].src = res.result.imageUrl;
          }),
        );
      }

      if (defaultValues) {
        if (isUpdatePending) toast.loading("글귀 수정 중...");
        update([defaultValues.phraseId, getToBeSendData(values)], {
          onSuccess: () => {
            toast.dismiss();
            toast.success("수정 되었습니다.");
            onSuccessCallback();
          },
          onError: () => {
            toast.dismiss();
            toast.error("수정에 실패했습니다.");
          },
        });
      } else {
        if (isCreatePending) toast.loading("글귀 등록 중...");
        create(getToBeSendData(values), {
          onSuccess: () => {
            toast.dismiss();
            toast.success("등록 되었습니다.");
            onSuccessCallback();
          },
          onError: () => {
            toast.dismiss();
            toast.error("등록에 실패했습니다.");
          },
        });
      }
    } catch (e) {
      setBlocking(false);
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      toast.dismiss();
      toast.error(message);
    }
  }

  return { onSubmit };
};
