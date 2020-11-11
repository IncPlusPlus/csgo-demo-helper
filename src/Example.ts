import pDefer = require('p-defer');

function delay(ms : number) {
    const deferred:pDefer.DeferredPromise<void> = pDefer();
    setTimeout(deferred.resolve, ms, '🦄');
    return deferred.promise;
}


(async () => {
    console.log(await delay(100));
    //=> '🦄'
})();