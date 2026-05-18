export const runtime = 'edge'

import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/request-service')
}
