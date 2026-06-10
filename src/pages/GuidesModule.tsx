import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from "uuid";
import { GuideList } from "./GuideList";
import { EditorPage } from "./EditorPage";
import { Sidebar } from "../components/Sidebar";
import { storage } from "../services/storage";
import { useClientContext } from "../contexts/ClientContext";

export const GuidesModule: React.FC = () => {
  const { selectedClientId } = useClientContext();
  const [currentView, setCurrentView] = useState<"list" | "editor">(
    () => (localStorage.getItem("current_view") as "list" | "editor") || "list"
  );
  const [activeGuideId, setActiveGuideId] = useState<string | null>(
    () => localStorage.getItem("active_guide_id")
  );
  const [markdownToImport, setMarkdownToImport] = useState<string | undefined>();

  // Reset view to home list of the workspace whenever client changes
  useEffect(() => {
    setCurrentView("list");
    setActiveGuideId(null);
    localStorage.removeItem("current_folder_id");
    window.dispatchEvent(new Event("current_folder_changed"));
  }, [selectedClientId]);

  useEffect(() => {
    localStorage.setItem("current_view", currentView);
  }, [currentView]);

  useEffect(() => {
    if (activeGuideId) {
      localStorage.setItem("active_guide_id", activeGuideId);
    } else {
      localStorage.removeItem("active_guide_id");
    }
  }, [activeGuideId]);

  const handleSelectGuide = (id: string) => {
    setActiveGuideId(id);
    setMarkdownToImport(undefined);
    setCurrentView("editor");
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (href && href.startsWith("#guide-")) {
          e.preventDefault();
          const guideId = href.replace("#guide-", "");
          handleSelectGuide(guideId);
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  const handleNewGuide = (folderId: string | null = null) => {
    const newId = uuidv4();
    const newGuide = {
      id: newId,
      title: "",
      folderId,
      content: { type: "doc", content: [{ type: "paragraph" }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.saveGuide(newGuide);
    setActiveGuideId(newId);
    setMarkdownToImport(undefined);
    setCurrentView("editor");
  };

  return (
    <>
      <Sidebar 
        activeGuideId={activeGuideId} 
        onSelectGuide={handleSelectGuide} 
        onNewGuide={(fid) => handleNewGuide(fid || null)} 
        onGoHome={() => {
          setCurrentView("list");
          setActiveGuideId(null);
          localStorage.removeItem("current_folder_id");
          window.dispatchEvent(new Event("current_folder_changed"));
        }}
      />
      
      <div className="flex-grow overflow-auto relative">
        {currentView === "list" ? (
          <GuideList
            onSelectGuide={handleSelectGuide}
            onNewGuide={(fid) => handleNewGuide(fid)}
          />
        ) : (
          activeGuideId && (
            <EditorPage
              guideId={activeGuideId}
              initialMarkdown={markdownToImport}
              onBack={() => setCurrentView("list")}
            />
          )
        )}
      </div>
    </>
  );
};
