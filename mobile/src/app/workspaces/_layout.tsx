import { Stack } from 'expo-router'

export default function WorkspacesLayout() {
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
                    title: 'STUDY COHORTS',
                    headerTitleAlign: 'center'
                }} 
            />
            <Stack.Screen 
                name="[id]" 
                options={{ 
                    title: 'COHORT HUB'
                }} 
            />
            <Stack.Screen 
                name="create" 
                options={{ 
                    title: 'CREATE COHORT',
                    presentation: 'modal'
                }} 
            />
        </Stack>
    )
}
