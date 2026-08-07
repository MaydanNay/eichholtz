import { useState, useEffect } from 'react'

let cachedContacts = null
let fetchPromise = null

const INSTAGRAM_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzMnIGhlaWdodD0nMzMnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJyBmaWxsPSdub25lJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxwYXRoIGZpbGwtcnVsZT0nZXZlbm9kZCcgY2xpcC1ydWxlPSdldmVub2RkJyBkPSdNNTAgMTAwQzc3LjYxNDIgMTAwIDEwMCA3Ny42MTQyIDEwMCA1MEMxMDAgMjIuMzg1OCA3Ny42MTQyIDAgNTAgMEMyMi4zODU4IDAgMCAyMi4zODU4IDAgNTBDMCA3Ny42MTQyIDIyLjM4NTggMTAwIDUwIDEwMFpNMjUgMzkuMzkxOEMyNSAzMS40NTU4IDMxLjQ1NjYgMjUgMzkuMzkxOCAyNUg2MC42MDgyQzY4LjU0NDIgMjUgNzUgMzEuNDU2NiA3NSAzOS4zOTE4VjYwLjgwMjhDNzUgNjguNzM4IDY4LjU0NDIgNzUuMTk0NiA2MC42MDgyIDc1LjE5NDZIMzkuMzkxOEMzMS40NTU4IDc1LjE5NDYgMjUgNjguNzM4IDI1IDYwLjgwMjhWMzkuMzkxOFpNMzYuOTg4MyA1MC4wMDU0QzM2Ljk4ODMgNDIuODg0NyA0Mi44NDM4IDM3LjA5MjIgNTAuMDM5NyAzNy4wOTIyQzU3LjIzNTYgMzcuMDkyMiA2My4wOTExIDQyLjg4NDcgNjMuMDkxMSA1MC4wMDU0QzYzLjA5MTEgNTcuMTI1MiA1Ny4yMzU2IDYyLjkxNzcgNTAuMDM5NyA2Mi45MTc3QzQyLjg0MyA2Mi45MTc3IDM2Ljk4ODMgNTcuMTI1MiAzNi45ODgzIDUwLjAwNTRaTTQxLjc0MjIgNTAuMDA1NEM0MS43NDIyIDU0LjUwMzMgNDUuNDY0MSA1OC4xNjM4IDUwLjAzOTcgNTguMTYzOEM1NC42MTUzIDU4LjE2MzggNTguMzM3MiA1NC41MDQxIDU4LjMzNzIgNTAuMDA1NEM1OC4zMzcyIDQ1LjUwNjYgNTQuNjE0NSA0MS44NDY5IDUwLjAzOTcgNDEuODQ2OUM0NS40NjQxIDQxLjg0NjkgNDEuNzQyMiA0NS41MDY2IDQxLjc0MjIgNTAuMDA1NFpNNjMuMzI0OCAzOS42MzU1QzY1LjAyMDggMzkuNjM1NSA2Ni4zOTU2IDM4LjI2MDYgNjYuMzk1NiAzNi41NjQ2QzY2LjM5NTYgMzQuODY4NyA2NS4wMjA4IDMzLjQ5MzggNjMuMzI0OCAzMy40OTM4QzYxLjYyODggMzMuNDkzOCA2MC4yNTM5IDM0Ljg2ODcgNjAuMjUzOSAzNi41NjQ2QzYwLjI1MzkgMzguMjYwNiA2MS42Mjg4IDM5LjYzNTUgNjMuMzI0OCAzOS42MzU1WicgZmlsbD0nI2ZmZmZmZicvPjwvc3ZnPg==";

const DEFAULT_CONTACTS = {
  astanaPhone: '+7 700 743 24 59',
  astanaAddress: 'Проспект Мангилик Ел, 23/1',
  almatyPhone: '',
  almatyAddress: 'Аль-Фараби, 140/1',
  emailGeneral: 'info@ideadecor.kz',
  emailCoop: 'marketing@ideadecor.kz',
  socials: [
    {
      id: 'default-insta',
      name: 'Instagram',
      url: 'https://www.instagram.com/eichholtzkz/',
      iconUrl: INSTAGRAM_ICON
    }
  ],
}

export function useContacts() {
  const [contacts, setContacts] = useState(cachedContacts || DEFAULT_CONTACTS)
  const [loading, setLoading] = useState(!cachedContacts)

  useEffect(() => {
    if (cachedContacts) {
      setContacts(cachedContacts)
      setLoading(false)
      return
    }

    if (!fetchPromise) {
      fetchPromise = fetch('/api/home-settings/settings')
        .then(res => res.json())
        .then(settings => {
          try {
            const parsed = JSON.parse(settings.contacts_info || '{}')
            cachedContacts = { ...DEFAULT_CONTACTS, ...parsed }
          } catch (e) {
            cachedContacts = { ...DEFAULT_CONTACTS }
          }
          return cachedContacts
        })
        .catch(() => {
          cachedContacts = { ...DEFAULT_CONTACTS }
          return cachedContacts
        })
    }

    let isMounted = true
    fetchPromise.then(data => {
      if (isMounted) {
        setContacts(data)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return { contacts, loading }
}
