"use client";

import type { ChangeEvent } from "react";
import { useRef } from "react";
import { toast } from "react-toastify";
import { Button } from "@nextui-org/button";

import {
  exportStoredData,
  importStoredData,
  migrateLegacyLocalStorageData,
  requestPersistentStorage,
} from "@/lib/app-storage";

const toastOptions = {
  autoClose: 2600,
  closeOnClick: true,
  draggable: true,
  pauseOnHover: true,
  position: "bottom-right" as const,
  theme: "colored" as const,
};

const buildFileName = () => {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ];

  return `nextdo-backup-${parts.join("-")}.json`;
};

export const BackupControls = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    try {
      await migrateLegacyLocalStorageData();
      const exportedData = await exportStoredData();
      const blob = new Blob([exportedData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = buildFileName();
      anchor.click();
      URL.revokeObjectURL(url);

      const persisted = await requestPersistentStorage();

      if (persisted) {
        toast.success("Backup exported. Persistent storage was enabled too.", toastOptions);
      } else {
        toast.success("Backup exported.", toastOptions);
      }
    } catch (error) {
      console.error("Failed to export backup:", error);
      toast.error("Backup export failed.", toastOptions);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      await importStoredData(fileText);
      toast.success("Backup imported. Reloading data...", toastOptions);
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Failed to import backup:", error);
      toast.error("Backup import failed. Check the JSON file.", toastOptions);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <Button
          size="sm"
          variant="flat"
          className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
          onPress={handleExport}
        >
          Export
        </Button>
        <Button
          size="sm"
          variant="flat"
          className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
          onPress={handleImportClick}
        >
          Import
        </Button>
      </div>

      <Button
        size="sm"
        variant="flat"
        className="md:hidden border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
        onPress={handleImportClick}
      >
        Backup
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImport}
      />
    </>
  );
};
