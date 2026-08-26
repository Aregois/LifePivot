import { verifyShopPurchase } from '@/app/actions'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { itemType, voidPlacement } = body

        if (!itemType) {
            return NextResponse.json({ error: 'Missing required field: itemType' }, { status: 400 })
        }

        const result = await verifyShopPurchase(itemType, voidPlacement)

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: result.message,
        })
    } catch (err: any) {
        console.error('Error in POST /api/shop/purchase:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
