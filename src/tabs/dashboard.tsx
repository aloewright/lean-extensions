import { useState } from "react"
import "../style.css"
import { useExtensions } from "../hooks/useExtensions"
import { useGroups, useLinks, useProfiles, useSettings } from "../hooks/useStorage"
import { ExtensionsSection } from "../components/ExtensionsSection"
import { ProfilesSection } from "../components/ProfilesSection"
import { GroupsSection } from "../components/GroupsSection"
import { LinksSection } from "../components/LinksSection"
import { CaptureSection } from "../components/CaptureSection"
import { CookiesSection } from "../components/CookiesSection"
import { SettingsSection } from "../components/SettingsSection"

type Section = "extensions" | "profiles" | "groups" | "links" | "cookies" | "capture" | "settings"

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "extensions", label: "Extensions", icon: "M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4z" },
  { id: "profiles", label: "Profiles", icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" },
  { id: "groups", label: "Groups", icon: "M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z" },
  { id: "links", label: "Links", icon: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" },
  { id: "cookies", label: "Cookies", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" },
  { id: "capture", label: "Capture", icon: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" },
  { id: "settings", label: "Settings", icon: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" }
]

function Dashboard() {
  const [section, setSection] = useState<Section>("extensions")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { extensions, loading, toggleExtension, uninstallExtension, toggleAll } = useExtensions()
  const { settings, update: updateSettings } = useSettings()
  const { profiles, addProfile, removeProfile, updateProfile } = useProfiles()
  const { groups, addGroup, removeGroup, toggleGroup } = useGroups()
  const { links, addLink, removeLink, updateLink, clearLinks } = useLinks()

  return (
    <div className="h-screen flex bg-bg text-fg font-sans">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 border-r border-border flex flex-col transition-all duration-200 ${
          sidebarOpen ? "w-52" : "w-14"
        }`}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          {sidebarOpen && <span className="text-sm font-semibold tracking-tight">Lean Ext</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-accent text-fg/60 hover:text-fg transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? (
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
              ) : (
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
              )}
            </svg>
          </button>
        </div>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                section === item.id
                  ? "bg-accent text-fg"
                  : "text-fg/50 hover:text-fg hover:bg-card/30"
              }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                <path d={item.icon} />
              </svg>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {section === "extensions" && (
          <ExtensionsSection
            extensions={extensions}
            loading={loading}
            settings={settings}
            onToggle={toggleExtension}
            onUninstall={uninstallExtension}
            onToggleAll={toggleAll}
            onUpdateSettings={updateSettings}
          />
        )}
        {section === "profiles" && (
          <ProfilesSection
            profiles={profiles}
            extensions={extensions}
            settings={settings}
            onAdd={addProfile}
            onRemove={removeProfile}
            onUpdate={updateProfile}
            onUpdateSettings={updateSettings}
          />
        )}
        {section === "groups" && (
          <GroupsSection
            groups={groups}
            extensions={extensions}
            onAdd={addGroup}
            onRemove={removeGroup}
            onToggle={toggleGroup}
          />
        )}
        {section === "links" && (
          <LinksSection
            links={links}
            onAdd={addLink}
            onRemove={removeLink}
            onUpdate={updateLink}
            onClear={clearLinks}
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        )}
        {section === "cookies" && <CookiesSection />}
        {section === "capture" && <CaptureSection />}
        {section === "settings" && (
          <SettingsSection settings={settings} extensions={extensions} onUpdate={updateSettings} />
        )}
      </main>
    </div>
  )
}

export default Dashboard
