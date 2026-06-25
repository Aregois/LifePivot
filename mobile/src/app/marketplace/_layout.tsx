import { Stack } from 'expo-router'

export default function MarketplaceLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#0E111F',
                },
                headerTintColor: '#00F0FF',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                contentStyle: {
                    backgroundColor: '#0B0D17',
                }
            }}
        >
            <Stack.Screen 
                name="index" 
                options={{ 
                    title: 'PLAN MARKETPLACE',
                    headerTitleAlign: 'center'
                }} 
            />
            <Stack.Screen 
                name="[id]" 
                options={{ 
                    title: 'PLAN SPECIFICATION'
                }} 
            />
        </Stack>
    )
}
