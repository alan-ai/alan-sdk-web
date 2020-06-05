projectAPI.sendAnswer = function (p, param, callback) {
    p.userData.answer = param.answer;
    callback(null, 'answer was saved');
};

intent("Am I right?", p => {
    let answer = p.userData.answer;
    switch (answer) {
        case "correct":
            p.play("You are right");
            break;
        case "incorrect":
            p.play("You are wrong");
            break;
        default:
            p.play("(Sorry,|) I have no data");
    }
});