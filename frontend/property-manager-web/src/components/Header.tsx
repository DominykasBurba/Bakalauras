import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole } from '../utils/auth'
import { useBuilding } from '../contexts/BuildingContext'

function parseResidentLocation(unit: string | undefined): { building: string; unitLine: string } {
  if (!unit?.trim()) return { building: '—', unitLine: '' }
  const parts = unit.split(',').map((s) => s.trim())
  if (parts.length >= 2) {
    return { building: parts[0], unitLine: parts.slice(1).join(', ') }
  }
  return { building: unit, unitLine: '' }
}

function unitFieldLabel(unit: string | undefined): string {
  if (!unit?.trim()) return '—'
  const idx = unit.indexOf(',')
  if (idx === -1) return unit.trim()
  return unit.slice(idx + 1).trim()
}

export function Header() {
  const { auth, logout } = useAuth()
  const isAdmin = isAdminRole(auth?.role)
  const { buildings, selectedBuildingId, setSelectedBuildingId, loading } = useBuilding()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const residentLoc = parseResidentLocation(auth?.unit)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="top-header">
      <div className="header-left">
        <h3>Dashboard</h3>
        <p className="welcome">Welcome back, {auth?.name ?? 'User'}</p>
      </div>
      <div className="header-right">
        {isAdmin ? (
          <>
            <div className="building-select-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="building-select"
                onClick={() => setDropdownOpen((o) => !o)}
                disabled={loading}
              >
                <div className="building-info">
                  <span className="building-name">
                    {selectedBuildingId == null
                      ? 'All buildings'
                      : buildings.find((b) => b.id === selectedBuildingId)?.name ?? 'Building'}
                  </span>
                  <span className="building-units">
                    {selectedBuildingId == null
                      ? `${buildings.length} properties`
                      : `${buildings.find((b) => b.id === selectedBuildingId)?.totalUnits ?? '—'} rooms`}
                  </span>
                </div>
                <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>▼</span>
              </button>
              {dropdownOpen && buildings.length > 0 && (
                <div className="building-dropdown">
                  <button
                    type="button"
                    className={`building-option ${selectedBuildingId == null ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedBuildingId(null)
                      setDropdownOpen(false)
                    }}
                  >
                    <span className="option-name">All buildings</span>
                    <span className="option-units">Portfolio view</span>
                  </button>
                  {buildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`building-option ${selectedBuildingId === b.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedBuildingId(b.id)
                        setDropdownOpen(false)
                      }}
                    >
                      <span className="option-name">{b.name}</span>
                      <span className="option-units">{b.totalUnits} rooms</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="unit-field">{unitFieldLabel(auth?.unit)}</div>
          </>
        ) : (
          <div className="building-select-wrapper">
            <div
              className="building-select building-select--readonly"
              aria-label="Your building and unit"
            >
              <div className="building-info">
                <span className="building-name">{residentLoc.building}</span>
                {residentLoc.unitLine ? (
                  <span className="building-units">{residentLoc.unitLine}</span>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className="header-user-actions">
          <Link
            to="/account"
            className="user-avatar user-avatar--link"
            title="Profile — account and password"
            aria-label="Open profile"
          >
            {auth?.name?.charAt(0) ?? 'U'}
          </Link>
          <button type="button" className="btn-secondary header-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
