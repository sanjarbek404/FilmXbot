
// Helper to test imports
const testImport = async (path) => {
    try {
        await import(path);
        console.log(`✅ Success: ${path}`);
    } catch (e) {
        console.error(`❌ FAILED: ${path}`);
        console.error(e);
        process.exit(1);
    }
};

(async () => {
    console.log('Testing Scene Imports...');
    await testImport('./src/scenes/addMovieScene.js');
    await testImport('./src/scenes/broadcastScene.js');
    await testImport('./src/scenes/vipScene.js');
    await testImport('./src/scenes/reviewScene.js');
    await testImport('./src/scenes/requestScene.js');
    await testImport('./src/scenes/anonChatScene.js');
    await testImport('./src/scenes/promoScene.js');
    await testImport('./src/scenes/promoRedeemScene.js');
    await testImport('./src/scenes/editMovieScene.js');
    await testImport('./src/scenes/autoPostSettingsScene.js');
    await testImport('./src/scenes/mandatorySubscriptionScene.js');

    console.log('Testing Command Imports...');
    await testImport('./src/commands/admin.js');
    await testImport('./src/commands/start.js');
    await testImport('./src/commands/user.js');
    await testImport('./src/commands/category.js');

    console.log('Testing Handlers...');
    await testImport('./src/handlers/channelGuard.js');
})();
