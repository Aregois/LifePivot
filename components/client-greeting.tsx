'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from './language-provider'

export function ClientGreeting() {
  const { t } = useLanguage()
  const [greetingKey, setGreetingKey] = useState('dashboard.welcome_back')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreetingKey('dashboard.good_morning')
    } else if (hour < 18) {
      setGreetingKey('dashboard.good_afternoon')
    } else {
      setGreetingKey('dashboard.good_evening')
    }
  }, [])

  return <>{t(greetingKey)}</>
}
