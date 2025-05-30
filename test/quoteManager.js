process.env.NODE_ENV = 'test';
process.env.QUOTES_ENABLED = 'true';

const { QuoteManager } = require('../services/QuoteManager');
const pubModulesManager = require('../pubmodules/pubModulesManager');  // on constructor init is undefined beacusae pub module is loaded after
var projectService = require('../services/projectService');
var userService = require('../services/userService');


let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../app');
let should = chai.should();

let expect = require('chai').expect;
let assert = require('chai').assert;

chai.use(chaiHttp);

// MOCK
const projectMock = require('./mock/projectMock');
const requestMock = require('./mock/requestMock');
const messageMock = require('./mock/messageMock');
const emailMock = require('./mock/emailMock');
const { MockTdCache } = require('./mock/tdCacheMock');
const mockTdCache = new MockTdCache();

let log = false;

// CONNECT REDIS - CHECK IT
const { TdCache } = require('../utils/TdCache');
let tdCache = new TdCache({
    host: process.env.CACHE_REDIS_HOST || '127.0.0.1',
    port: process.env.CACHE_REDIS_PORT || '6379',
    password: process.env.CACHE_REDIS_PASSWORD || undefined
});

tdCache.connect();
// var redis = require('redis')
// var redis_client;

// const dateList = [
//     "2023-10-17T08:45:54.058Z",
//     "2023-10-20T08:45:54.058Z",
//     "2023-10-28T08:45:54.058Z",
//     "2023-10-31T08:45:54.058Z",
//     "2023-11-19T08:45:54.058Z",
//     "2023-11-22T08:45:54.058Z",
//     "2023-11-27T08:45:54.058Z",
//     "2023-12-01T08:45:54.058Z",
//     "2023-12-20T08:45:54.058Z",
//     "2023-12-21T08:45:54.058Z"
// ]

const dateList = [
    "2023-10-24T08:45:54.058Z",
    "2023-10-25T08:45:54.058Z",
    "2023-10-26T08:45:54.058Z",
    "2023-10-27T08:45:54.058Z",
    "2023-10-28T08:45:54.058Z",
    "2023-10-29T08:45:54.058Z"
]

const dateListStress = [
    "2024-02-05T10:30:00.058Z",
    "2024-03-05T10:30:00.058Z",
    "2024-04-05T10:30:00.058Z",
    "2024-05-05T10:30:00.058Z",
    "2024-06-05T10:30:00.058Z",
    "2024-07-05T10:30:00.058Z",
    "2024-08-05T10:30:00.058Z",
    "2024-09-05T10:30:00.058Z",
    "2024-10-05T10:30:00.058Z",
    "2024-11-05T10:30:00.058Z",
    "2024-12-05T10:30:00.058Z",
    "2025-01-05T10:30:00.058Z",
    "2025-02-05T10:30:00.058Z",
    "2025-03-05T10:30:00.058Z"
]

const expectedSlotStarts = [
    "1/31/2024",
    "2/29/2024",
    "3/31/2024",
    "4/30/2024",
    "5/31/2024",
    "6/30/2024",
    "7/31/2024",
    "8/31/2024",
    "9/30/2024",
    "10/31/2024",
    "11/30/2024",
    "12/31/2024",
    "1/31/2025",
    "2/28/2025",
    "3/31/2025"
]

const _expectedSlotStarts_PRE = [
    "31/01/2024",
    "29/02/2024",
    "31/03/2024",
    "30/04/2024",
    "31/05/2024",
    "30/06/2024",
    "31/07/2024",
    "31/08/2024",
    "30/09/2024",
    "31/10/2024",
    "30/11/2024",
    "31/12/2024",
    "31/01/2025",
    "28/02/2025",
    "31/03/2025"
]
// connectRedis();

// function connectRedis() {
//     console.log(">>> connectRedis")
//     redis_client = redis.createClient({
//         host: "127.0.0.1",
//         port: 6379,
//     });

//     redis_client.on('error', err => {
//         console.log('(quoteManager TEST) Connect Redis Error ' + err);
//     })

//     redis_client.on('ready', () => {
//         console.log("(quoteManager TEST) Redis ready!")
//     })
// }



// let cacheClient = undefined;
// if (pubModulesManager.cache) {
//     cacheClient = pubModulesManager.cache._cache._cache;  //_cache._cache to jump directly to redis modules without cacheoose wrapper (don't support await)
// }

// let tdCache = undefined;
// if (cacheClient) {
//     tdCache = cacheClient;
//     console.log("using 'cacheClient' for the test")
// } else if (redis_client) {
//     tdCache = redis_client
//     console.log("using 'redis_client' for the test")
// } else {
//     tdCache = mockTdCache;
//     console.log("using 'mockTdCache' for the test")
// }

let quoteManager = new QuoteManager({ tdCache: tdCache });
quoteManager.start();


describe('QuoteManager', function () {


    it('incrementRequestsCountStress',  (done) => {
        /**
         * For this test the subscription starts on 31 Genuary.
         * Slots must start on 31 Gen, 28/29 Feb, 31 Mar, 30 Apr, ...
         */
        let mockProject = projectMock.mockProjectPremiumPlan2;
        let mockRequest = requestMock.requestMock;

        if (log) { console.log("Starting stress test with one year long cycle of renewals") }

        let i = 0;
        async function test(date) {
            
            mockRequest.createdAt = new Date(date);
            let key_incremented = await quoteManager.incrementRequestsCount(mockProject, mockRequest);
            if (log) { console.log("request_date: ", mockRequest.createdAt, "key_incremented: ", key_incremented); }
            
            let slot_start = key_incremented.substring(key_incremented.lastIndexOf(':') + 1)
            expect(slot_start).to.equal(expectedSlotStarts[i]);

            i += 1;
            if (i < dateListStress.length) {
                setTimeout(() => {
                    test(dateListStress[i])
                }, 250);
            } else {
                if (log) { console.log("All dates tested successfully."); }
                done();
            }
        }
        test(dateListStress[0]);

    }).timeout(10000)

    it('incrementRequestsCount', async function () {

        let mockProject = projectMock.mockProjectBasicPlan;
        let mockRequest = requestMock.requestMock;

        mockRequest.createdAt = new Date(dateList[0]);

        let initial_quote = await quoteManager.getCurrentQuote(mockProject, mockRequest, 'requests');
        if (log) { console.log("[Quote Test] initial_quote: ", initial_quote); }

        let key_incremented = await quoteManager.incrementRequestsCount(mockProject, mockRequest);
        if (log) { console.log("[Quote Test] key_incremented: ", key_incremented); }

        let final_quote = await quoteManager.getCurrentQuote(mockProject, mockRequest, 'requests');
        if (log) { console.log("[Quote Test] final_quote: ", final_quote); }

        expect(key_incremented).to.equal("quotes:requests:64e36f5dbf72263f7c059999:10/20/2023");
        expect(final_quote).to.equal(initial_quote + 1);
    })

    it('incrementMessagesCount', async function () {
        let mockProject = projectMock.mockProjectSandboxPlan;
        let mockMessage = messageMock.messageMock;

        mockMessage.createdAt = new Date();

        let initial_quote = await quoteManager.getCurrentQuote(mockProject, mockMessage, 'messages');
        if (log) { console.log("[Quote Test] initial_quote: ", initial_quote); }

        let key_incremented = await quoteManager.incrementMessagesCount(mockProject, mockMessage);
        if (log) { console.log("[Quote Test] key_incremented: ", key_incremented); }

        let final_quote = await quoteManager.getCurrentQuote(mockProject, mockMessage, 'messages');
        if (log) { console.log("[Quote Test] current quote: ", final_quote); }

        //expect(key_incremented).to.equal("quotes:messages:64e36f5dbf72263f7c059999:20/10/2023");
        expect(final_quote).to.equal(initial_quote + 1);

    })

    it('incrementEmailCount', async function () {
        let mockProject = projectMock.mockProjectSandboxPlan;
        let mockEmail = emailMock.emailMock;

        let result = await quoteManager.checkQuote(mockProject, mockEmail, 'email');
        if (log) { console.log("checkQuote result: ", result) }

        let initial_quote = await quoteManager.getCurrentQuote(mockProject, mockEmail, 'email');
        if (log) { console.log("[Quote Test] initial_quote: ", initial_quote); }

        let key_incremented = await quoteManager.incrementEmailCount(mockProject, mockEmail);
        if (log) { console.log("[Quote Test] key_incremented: ", key_incremented); }

        let final_quote = await quoteManager.getCurrentQuote(mockProject, mockEmail, 'email');
        if (log) { console.log("[Quote Test] current quote: ", final_quote); }

        expect(key_incremented).to.equal("quotes:email:64e36f5dbf72263f7c059999:10/20/2023");
        expect(final_quote).to.equal(initial_quote + 1);

    })

    it('sendEmailDirect', (done) => {

        var email = "test-signup-" + Date.now() + "@email.com";
        var pwd = "pwd";

        userService.signup(email, pwd, "Test Firstname", "Test lastname").then(function (savedUser) {
            projectService.create("test-send-email-direct", savedUser._id).then(function (savedProject) {
                chai.request(server)
                    .post('/' + savedProject._id + '/emails/internal/send')
                    .auth(email, pwd)
                    .send({ to: "giovanni.troisiub@gmail.com", text: "Hello", subject: "HelloSub", replyto: "giovanni.troisiub@gmail.com" })
                    .end((err, res) => {

                        if (err) { console.error("email internal send err: ", err); }
                        if (log) { console.log("email internal send res.body", res.body); }
                        
                        done();
                    });
            });
        });

    })

    it('incrementTokensCount', (done) => {

        var email = "test-quote-" + Date.now() + "@email.com"; 
        var pwd = "pwd";

        userService.signup(email, pwd, "Test Firstname", "Test Lastname").then((savedUser) => {
            projectService.create("quote-project", savedUser._id).then((savedProject) => {

                let createdAt = new Date();
                createdAt.setDate(createdAt.getDate() + 1)

                chai.request(server)
                    .post('/' + savedProject._id + "/openai/quotes")
                    .auth(email, pwd)
                    .send({ createdAt: createdAt , tokens: 128, multiplier: 25 })
                    .end((err, res) => {

                        if (err) { console.error("err: ", err); }
                        if (log) { console.log("res.body", res.body )};

                        res.should.have.status(200);
                        res.body.should.be.a('object');

                        const options = {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        };                          
                        let date = new Date().toLocaleDateString(undefined, options);
                    
                        let key = "quotes:tokens:" + savedProject._id + ":" + date;
                        let message_resp = "value incremented for key " + key;
                        // CHECK IT!!!!
                        //expect(res.body.message).to.equal(message_resp);
                        //expect(res.body.key).to.equal(key);
                        let expected_quote = 128 * 25;
                        expect(res.body.currentQuote).to.equal(expected_quote);


                        done();
                    })
            })
        })


    })




    // it('incrementRequestCountMulti', async function () {
    //     let mockProject = projectMock.mockProjectSandboxPlan;
    //     let mockRequest = requestMock.requestMock;

    //     let quoteManager = new QuoteManager({ project: mockProject, tdCache: tdCache });

    //     for (let date of dateList) {
    //         mockRequest.createdAt = new Date(date);
    //         let result = await quoteManager.incrementRequestsCount(mockRequest);
    //         console.log("result: ", result);
    //         console.log("\n\n");
    //     }

    // })

    // it('incrementRequestCountLimitReached', async function () {

    //     let mockProject = projectMock.mockProjectSandboxPlan;
    //     let mockRequest = requestMock.requestMock;

    //     // for the test the limit is fixed to 5

    //     let i;
    //     let quoteManager = new QuoteManager({ project: mockProject, tdCache: tdCache });

    //     for (i = 0; i < 5; i++) {
    //         mockRequest.createdAt = new Date(dateList[i]);
    //         await quoteManager.incrementRequestsCount(mockRequest);
    //     }

    //     mockRequest.createdAt = new Date(dateList[i]);
    //     let result = await quoteManager.incrementRequestsCount(mockRequest);
    //     console.log("result: ", result);


    // })

    // it('getCurrentCount', async function() {
    //     let mockProject = projectMock.mockProjectSandboxPlan;
    //     let mockRequest = requestMock.requestMock; 

    //     let quoteManager = new QuoteManager({ project: mockProject, tdCache: mockTdCache } );

    //     for (let date of dateList) {
    //         mockRequest.createdAt = new Date(date);
    //         let result = await quoteManager.incrementRequestCount(mockRequest);
    //         console.log("result: ", result);
    //     }

    //     let today = new Date('2023-12-22T08:45:54.058Z');
    //     let quote = await quoteManager.getCurrentQuote(today, 'requests');
    //     console.log("request quote: ", quote)


    // })
})