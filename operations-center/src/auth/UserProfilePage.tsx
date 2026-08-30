import { useEffect, useMemo, useState } from "react"
import {
  apiFetch,
  clearToken,
  getContextToken,
  getToken,
} from "../api"
import { getUserFromToken, parseJwt } from "./jwt"
import "../styles/ui.css"
import "./user-profile.css"

type UserProfile = {
  display_name?: string
  first_name?: string
  last_name?: string
  preferred_name?: string
  title?: string
  department?: string
  team?: string
  organization?: string
  location?: string
  timezone?: string
  phone?: string
  avatar_url?: string
  website?: string
  bio?: string
}

type ProfileField = {
  key: keyof UserProfile
  label: string
  type?: "text" | "tel" | "url"
  placeholder?: string
}

const EMPTY_PROFILE: Required<UserProfile> = {
  display_name: "",
  first_name: "",
  last_name: "",
  preferred_name: "",
  title: "",
  department: "",
  team: "",
  organization: "",
  location: "",
  timezone: "",
  phone: "",
  avatar_url: "",
  website: "",
  bio: "",
}

const PERSONAL_FIELDS: ProfileField[] = [
  { key: "display_name", label: "Display name", placeholder: "Andrew Campagna" },
  { key: "first_name", label: "First name", placeholder: "Andrew" },
  { key: "last_name", label: "Last name", placeholder: "Campagna" },
  { key: "preferred_name", label: "Preferred name", placeholder: "Andrew" },
]

const WORK_FIELDS: ProfileField[] = [
  { key: "title", label: "Title", placeholder: "Senior DevOps Engineer" },
  { key: "department", label: "Department", placeholder: "Engineering" },
  { key: "team", label: "Team", placeholder: "Platform" },
  { key: "organization", label: "Organization", placeholder: "Herringbone" },
]

const CONTACT_FIELDS: ProfileField[] = [
  { key: "location", label: "Location", placeholder: "Austin, TX" },
  { key: "timezone", label: "Timezone", placeholder: "America/Chicago" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+1 555 555 0100" },
  { key: "website", label: "Website", type: "url", placeholder: "https://example.com" },
  { key: "avatar_url", label: "Avatar URL", type: "url", placeholder: "https://example.com/avatar.png" },
]

function formatTime(ts: unknown) {
  if (typeof ts !== "number") return "-"

  const date = new Date(ts * 1000)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString()
}

function formatRelativeExpiry(ts: unknown) {
  if (typeof ts !== "number") return "Unknown"

  const remaining = ts * 1000 - Date.now()
  if (remaining <= 0) return "Expired"

  const minutes = Math.floor(remaining / 60000)
  if (minutes < 60) return `${minutes}m remaining`

  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h remaining`

  const days = Math.floor(hours / 24)
  return `${days}d remaining`
}

function copy(text?: string) {
  if (!text) return
  void navigator.clipboard.writeText(text)
}

function normalizeProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== "object") return null

  const raw = value as Record<string, unknown>
  const result: UserProfile = {}

  for (const key of Object.keys(EMPTY_PROFILE) as Array<keyof UserProfile>) {
    const field = raw[key]
    if (typeof field === "string") result[key] = field
  }

  return result
}

function toFormProfile(profile: UserProfile | null): Required<UserProfile> {
  return {
    ...EMPTY_PROFILE,
    ...(profile || {}),
  }
}

function getDisplayName(profile: UserProfile | null, email?: string) {
  return (
    profile?.display_name ||
    profile?.preferred_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    email ||
    "User"
  )
}

function profileInitials(profile: UserProfile | null, email?: string) {
  const name = getDisplayName(profile, email).trim()
  const parts = name.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  return name.slice(0, 2).toUpperCase()
}

function readError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === "string" && detail) return detail
  }

  return fallback
}

function hasProfileContent(profile: UserProfile | null) {
  if (!profile) return false
  return Object.values(profile).some((value) => Boolean(value?.trim()))
}

function cleanHref(value?: string) {
  if (!value) return undefined
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

export default function UserProfilePage() {
  const user = getUserFromToken()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<Required<UserProfile>>(EMPTY_PROFILE)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(
    () => getContextToken() || getToken()
  )

  const payload = useMemo(() => parseJwt(sessionToken), [sessionToken])

  const contextId =
    localStorage.getItem("hb_context_id") ||
    (typeof payload?.context_id === "string" ? payload.context_id : "default")

  const displayName = getDisplayName(profile, user?.email)
  const initials = profileInitials(profile, user?.email)
  const profileConfigured = hasProfileContent(profile)
  const websiteHref = cleanHref(profile?.website)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    void loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch("/herringbone/auth/user_profile/get")

      setSessionToken(getContextToken() || getToken())

      if (res.status === 404) {
        setProfile(null)
        setForm(EMPTY_PROFILE)
        return
      }

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(readError(data, `HTTP ${res.status}`))
      }

      const loaded = normalizeProfile(data?.profile)
      setProfile(loaded)
      setForm(toFormProfile(loaded))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile")
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await apiFetch("/herringbone/auth/user_profile/set", {
        method: "POST",
        body: JSON.stringify(form),
      })

      setSessionToken(getContextToken() || getToken())

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(readError(data, `HTTP ${res.status}`))
      }

      const updated = normalizeProfile(data?.profile) || { ...form }

      setProfile(updated)
      setForm(toFormProfile(updated))
      setEditing(false)
      setSuccess("Profile updated")

      window.setTimeout(() => setSuccess(null), 2600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile")
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: keyof UserProfile, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function startEditing() {
    setForm(toFormProfile(profile))
    setError(null)
    setSuccess(null)
    setEditing(true)
  }

  function cancelEditing() {
    setForm(toFormProfile(profile))
    setError(null)
    setEditing(false)
  }

  function logout() {
    clearToken()
    window.location.href = "/login"
  }

  if (!user) {
    return (
      <div className="hb-page hb-profile-page">
        <div className="hb-header">
          <h1 className="hb-title">Profile</h1>
          <div className="hb-subtitle">Manage your Herringbone identity and session.</div>
        </div>

        <div className="hb-card">
          <div className="hb-alert-error">Not authenticated</div>
        </div>
      </div>
    )
  }

  return (
    <div className="hb-page hb-profile-page">
      <div className="hb-profile-page-heading">
        <div>
          <h1 className="hb-title">Profile</h1>
          <div className="hb-subtitle">Your account, workspace identity, and session.</div>
        </div>

        {!editing && !loading && (
          <button className="hb-button hb-profile-primary-action" onClick={startEditing}>
            <EditIcon />
            {profileConfigured ? "Edit profile" : "Create profile"}
          </button>
        )}
      </div>

      {error && <div className="hb-alert-error hb-profile-banner">{error}</div>}
      {success && <div className="hb-profile-success-banner">{success}</div>}

      {loading ? (
        <ProfileSkeleton />
      ) : editing ? (
        <ProfileEditor
          form={form}
          saving={saving}
          onChange={updateField}
          onCancel={cancelEditing}
          onSave={() => void saveProfile()}
        />
      ) : (
        <div className="hb-profile-dashboard">
          <main className="hb-profile-main-column">
            <section className="hb-profile-hero-card">
              <div className="hb-profile-hero-top">
                <div className="hb-profile-avatar-wrap">
                  {profile?.avatar_url ? (
                    <img
                      className="hb-profile-avatar"
                      src={profile.avatar_url}
                      alt={displayName}
                    />
                  ) : (
                    <div className="hb-profile-avatar hb-profile-avatar-fallback">
                      {initials}
                    </div>
                  )}
                  <div className="hb-profile-presence" title="Authenticated" />
                </div>

                <div className="hb-profile-hero-copy">
                  <div className="hb-profile-name-row">
                    <h2 className="hb-profile-name">{displayName}</h2>
                    <span className="hb-profile-context-chip">
                      {contextId === "default" ? "Default workspace" : "Organization context"}
                    </span>
                  </div>

                  <div className="hb-profile-email">{user.email}</div>

                  {(profile?.title || profile?.organization) && (
                    <div className="hb-profile-role-line">
                      {profile?.title && <span>{profile.title}</span>}
                      {profile?.title && profile?.organization && <span className="hb-profile-dot">•</span>}
                      {profile?.organization && <span>{profile.organization}</span>}
                    </div>
                  )}

                  <div className="hb-profile-meta-line">
                    {profile?.location && (
                      <span className="hb-profile-meta-item">
                        <PinIcon />
                        {profile.location}
                      </span>
                    )}

                    {profile?.timezone && (
                      <span className="hb-profile-meta-item">
                        <ClockIcon />
                        {profile.timezone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!profileConfigured && (
                <div className="hb-profile-setup-callout">
                  <div>
                    <div className="hb-profile-setup-title">Complete your profile</div>
                    <div className="hb-profile-setup-copy">
                      Add your name, role, organization, and contact details so your Herringbone identity is easier to recognize.
                    </div>
                  </div>
                  <button className="hb-button-secondary" onClick={startEditing}>
                    Add details
                  </button>
                </div>
              )}
            </section>

            {(profile?.bio || profileConfigured) && (
              <section className="hb-profile-content-card">
                <div className="hb-profile-card-heading">
                  <div>
                    <h3>About</h3>
                    <p>Personal and professional profile details.</p>
                  </div>
                </div>

                {profile?.bio && (
                  <div className="hb-profile-bio-block">
                    <p>{profile.bio}</p>
                  </div>
                )}

                <div className="hb-profile-detail-grid">
                  <DetailItem label="Preferred name" value={profile?.preferred_name || profile?.first_name} />
                  <DetailItem label="Department" value={profile?.department} />
                  <DetailItem label="Team" value={profile?.team} />
                  <DetailItem label="Organization" value={profile?.organization} />
                  <DetailItem label="Location" value={profile?.location} />
                  <DetailItem label="Timezone" value={profile?.timezone} mono />
                  <DetailItem label="Phone" value={profile?.phone} />
                  <DetailItem
                    label="Website"
                    value={profile?.website}
                    href={websiteHref}
                  />
                </div>
              </section>
            )}
          </main>

          <aside className="hb-profile-side-column">
            <section className="hb-profile-side-card">
              <div className="hb-profile-side-heading">
                <div className="hb-profile-side-icon"><UserIcon /></div>
                <div>
                  <h3>Account</h3>
                  <p>Authenticated identity</p>
                </div>
              </div>

              <div className="hb-profile-compact-list">
                <CompactRow label="Email" value={user.email || "-"} copyValue={user.email} />
                <CompactRow label="User ID" value={user.id} copyValue={user.id} mono />
                <CompactRow label="Context" value={contextId} mono={contextId !== "default"} />
              </div>
            </section>

            <section className="hb-profile-side-card">
              <div className="hb-profile-side-heading">
                <div className="hb-profile-side-icon"><ShieldIcon /></div>
                <div>
                  <h3>Session</h3>
                  <p>{getContextToken() ? "Context token" : "Base token"}</p>
                </div>
              </div>

              <div className="hb-profile-session-status">
                <div className="hb-profile-session-dot" />
                <div>
                  <strong>Active session</strong>
                  <span>{formatRelativeExpiry(payload?.exp)}</span>
                </div>
              </div>

              <div className="hb-profile-compact-list hb-profile-session-list">
                <CompactRow label="Issued" value={formatTime(payload?.iat)} />
                <CompactRow label="Expires" value={formatTime(payload?.exp)} />
                {typeof payload?.iss === "string" && payload.iss && (
                  <CompactRow label="Issuer" value={payload.iss} />
                )}
              </div>

              <button
                className="hb-profile-token-toggle"
                onClick={() => setShowToken((value) => !value)}
              >
                <KeyIcon />
                {showToken ? "Hide access token" : "View access token"}
                <ChevronIcon open={showToken} />
              </button>

              {showToken && sessionToken && (
                <div className="hb-profile-token-panel">
                  <div className="hb-profile-token-warning">
                    Treat this token like a password. Anyone with it can access the API as you.
                  </div>
                  <pre className="hb-profile-token-value">{sessionToken}</pre>
                  <button
                    className="hb-button-secondary hb-profile-copy-token"
                    onClick={() => copy(sessionToken)}
                  >
                    Copy token
                  </button>
                </div>
              )}
            </section>

            <button className="hb-profile-logout" onClick={logout}>
              <LogoutIcon />
              Sign out
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}

function ProfileEditor({
  form,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  form: Required<UserProfile>
  saving: boolean
  onChange: (field: keyof UserProfile, value: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  const previewProfile: UserProfile = form
  const previewName = getDisplayName(previewProfile)
  const previewInitials = profileInitials(previewProfile)

  return (
    <div className="hb-profile-editor-shell">
      <div className="hb-profile-editor-header">
        <div>
          <h2>Edit profile</h2>
          <p>Update how your identity appears throughout Herringbone.</p>
        </div>

        <div className="hb-profile-editor-actions hb-profile-editor-actions-top">
          <button className="hb-button-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="hb-button" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <div className="hb-profile-editor-layout">
        <aside className="hb-profile-editor-preview">
          <div className="hb-profile-editor-avatar-wrap">
            {form.avatar_url ? (
              <img className="hb-profile-editor-avatar" src={form.avatar_url} alt={previewName} />
            ) : (
              <div className="hb-profile-editor-avatar hb-profile-avatar-fallback">
                {previewInitials}
              </div>
            )}
          </div>
          <div className="hb-profile-editor-preview-name">{previewName}</div>
          {form.title && <div className="hb-profile-editor-preview-title">{form.title}</div>}
          {form.organization && <div className="hb-profile-editor-preview-org">{form.organization}</div>}
          <div className="hb-profile-editor-preview-note">
            This preview updates as you edit your profile.
          </div>
        </aside>

        <div className="hb-profile-editor-form">
          <EditorSection
            title="Identity"
            description="How your name appears to other Herringbone users."
            fields={PERSONAL_FIELDS}
            form={form}
            onChange={onChange}
          />

          <EditorSection
            title="Work"
            description="Your role and place within the organization."
            fields={WORK_FIELDS}
            form={form}
            onChange={onChange}
          />

          <EditorSection
            title="Contact & location"
            description="Optional details used to complete your profile."
            fields={CONTACT_FIELDS}
            form={form}
            onChange={onChange}
          />

          <div className="hb-profile-editor-section">
            <div className="hb-profile-editor-section-heading">
              <h3>About</h3>
              <p>A short description shown on your profile.</p>
            </div>

            <label className="hb-profile-field hb-profile-field-wide">
              <span className="hb-profile-field-label">Bio</span>
              <textarea
                className="hb-profile-textarea"
                rows={5}
                value={form.bio}
                onChange={(event) => onChange("bio", event.target.value)}
                placeholder="Tell people a little about yourself..."
              />
            </label>
          </div>
        </div>
      </div>

      <div className="hb-profile-editor-footer">
        <button className="hb-button-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="hb-button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  )
}

function EditorSection({
  title,
  description,
  fields,
  form,
  onChange,
}: {
  title: string
  description: string
  fields: ProfileField[]
  form: Required<UserProfile>
  onChange: (field: keyof UserProfile, value: string) => void
}) {
  return (
    <div className="hb-profile-editor-section">
      <div className="hb-profile-editor-section-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="hb-profile-form-grid">
        {fields.map((field) => (
          <label
            className={`hb-profile-field ${field.key === "avatar_url" ? "hb-profile-field-wide" : ""}`}
            key={field.key}
          >
            <span className="hb-profile-field-label">{field.label}</span>
            <input
              className="hb-input hb-profile-input"
              type={field.type || "text"}
              value={form[field.key]}
              placeholder={field.placeholder}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function DetailItem({
  label,
  value,
  mono = false,
  href,
}: {
  label: string
  value?: string
  mono?: boolean
  href?: string
}) {
  if (!value) return null

  return (
    <div className="hb-profile-detail-item">
      <div className="hb-profile-detail-label">{label}</div>
      <div className={`hb-profile-detail-value ${mono ? "hb-mono" : ""}`}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  )
}

function CompactRow({
  label,
  value,
  copyValue,
  mono = false,
}: {
  label: string
  value: string
  copyValue?: string
  mono?: boolean
}) {
  return (
    <div className="hb-profile-compact-row">
      <div className="hb-profile-compact-label">{label}</div>
      <div className="hb-profile-compact-value-row">
        <span className={`hb-profile-compact-value ${mono ? "hb-mono" : ""}`} title={value}>
          {value}
        </span>
        {copyValue && (
          <button
            className="hb-profile-icon-button"
            title={`Copy ${label.toLowerCase()}`}
            aria-label={`Copy ${label.toLowerCase()}`}
            onClick={() => copy(copyValue)}
          >
            <CopyIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="hb-profile-dashboard" aria-label="Loading profile">
      <div className="hb-profile-main-column">
        <div className="hb-profile-hero-card hb-profile-skeleton-card">
          <div className="hb-profile-skeleton hb-profile-skeleton-avatar" />
          <div className="hb-profile-skeleton-lines">
            <div className="hb-profile-skeleton hb-profile-skeleton-line-lg" />
            <div className="hb-profile-skeleton hb-profile-skeleton-line-md" />
            <div className="hb-profile-skeleton hb-profile-skeleton-line-sm" />
          </div>
        </div>
        <div className="hb-profile-content-card hb-profile-skeleton-block">
          <div className="hb-profile-skeleton hb-profile-skeleton-line-md" />
          <div className="hb-profile-skeleton hb-profile-skeleton-row" />
          <div className="hb-profile-skeleton hb-profile-skeleton-row" />
        </div>
      </div>
      <div className="hb-profile-side-column">
        <div className="hb-profile-side-card hb-profile-skeleton-block">
          <div className="hb-profile-skeleton hb-profile-skeleton-line-md" />
          <div className="hb-profile-skeleton hb-profile-skeleton-row" />
          <div className="hb-profile-skeleton hb-profile-skeleton-row" />
        </div>
      </div>
    </div>
  )
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4.2L19 9.2a2.8 2.8 0 0 0-4-4L4.2 16V20Zm10-13 3 3" /></svg>
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
}

function UserIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7 3.8-4" /></svg>
}

function KeyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8m-3 3 2 2m-5 1 2 2" /></svg>
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
}

function LogoutIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4m4-4H9" /></svg>
}

function ChevronIcon({ open }: { open: boolean }) {
  return <svg className={open ? "is-open" : ""} viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
}