visualHints('Say "What can I do here?"',
    'Say "How does this work?"',
    'Say "What does this app do?"',
    'Say "Order coffee"',
    'Say "How should I use this?"');

intent(`What does this app do?`, `How does this work?`, `What can I do here?`, `How should I use this?`, p => {
    p.play("This is an application for ordering drinks. You can order different types of coffees and some desserts");
    p.play("Would you like to make an order?");
    p.then(makeOrder);
});

intent(`Order coffee`, p => {
    startOrder(p);
});

let makeOrder = context(() => {
    follow("(probably|)$(ANSWER yes|sure|no)", p => {
        let answer = p.ANSWER.value;
        if (['yes', 'sure'].indexOf(answer) >= 0) {
            startOrder(p);
        } else if (answer === 'no') {
            p.play("We sure we can cook a great coffee for you next time.");
        }
    });
});

function startOrder(p) {
    p.play({command: 'start-order'});
    p.play("We have");
    p.play({command: 'highlight', data:{item: 'americano'}});
    p.play("americano");
    p.play({command: 'highlight', data:{item: 'cappuccino'}});
    p.play("cappuccino");
    p.play({command: 'highlight', data:{item: 'latte'}});
    p.play("and latte");
    p.play("What drink would you like to order?");
    p.then(orderCoffee);
}

let orderCoffee = context(() => {
    follow("(I will take|I'd like to order|)$(DRINK americano|cappuccino|latte)",  p => {
        let coffee = p.DRINK.value.toLowerCase();
        p.userData.coffee = coffee;
        p.play({command:'select-coffee', data:{item: coffee}});
        p.play(`${coffee} is great choice`);
        p.play({command: 'go-to-next-step'});
        p.play("We've cooked for you");
        p.play({command: 'highlight', data:{item: 'apple pie'}});
        p.play(" an apple pie");
        p.play({command: 'highlight', data:{item: 'cheesecake'}});
        p.play(" and cheesecake.");
        p.play("What dessert would you like to order?");
        p.then(orderDessert);
    });
});

let orderDessert = context(()=>{
    follow("(I want|) $(DESSERT apple pie|cheesecake)",  p => {
        let dessert = p.DESSERT.value.toLowerCase();
        p.userData.dessert = dessert;
        p.play({command:'select-dessert', data:{item:dessert}});
        p.play(`Excellent`);
        p.play({command: 'go-to-next-step'});
        p.play(`You ordered ${p.userData.coffee} and ${p.userData.dessert }`);
        p.play("Would you like to finish your order?");
    });
});

intent(`What does this app do?`, `How does this work?`, `What can I do here?`, `How should I use this?`, p => {
    p.play("This is an application for ordering drinks. You can order different types of coffees and some desserts")
    p.play("Would you like to make an order?");
    p.then(makeOrder);
});

intent(`Go next`, p => {
    p.play({command: 'go-to-next-step'});
});

intent(`Go back`, p => {
    p.play({command: 'go-to-prev-step'});
});

intent(`Finish order`, p => {
    p.play({command: 'finish-order'});
    p.play('Enjoy your meal!');
});