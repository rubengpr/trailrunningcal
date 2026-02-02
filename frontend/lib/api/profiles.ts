export async function updateProfile(data: { userName: string, userRole: string }) {
    const response = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const responseData = await response.json()

    if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update profile');
    }

    return responseData;
}