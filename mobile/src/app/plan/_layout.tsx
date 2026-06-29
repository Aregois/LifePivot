import { Stack } from 'expo-router'

export default function PlanLayout() {
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
                name="[id]" 
                options={{ 
                    title: 'PERSONAL PLAN'
                }} 
            />
            <Stack.Screen 
                name="create" 
                options={{ 
                    title: 'CREATE PLAN'
                }} 
            />
        </Stack>
    )
}
