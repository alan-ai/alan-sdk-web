import { AfterViewInit, Component, ViewChild } from '@angular/core';
import {
    trigger,
    style,
    animate,
    transition,
} from '@angular/animations';

const animDuration = 300;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    animations: [
        trigger('fadeInAndOutAnimation',
            [
                transition(':enter', [
                    style({ opacity: '0' }),
                    animate(animDuration, style({ opacity: '1' })),
                ]),
                transition(':leave', [
                    style({ opacity: '1' }),
                    animate(animDuration, style({ opacity: '0' })),
                ]),
            ]),
    ]
})
export class AppComponent implements AfterViewInit {
    isLinear = false;
    selectedDrink = '';
    selectedDessert = '';
    orderDetails = '';

    @ViewChild('stepper', { static: false }) stepper: any;

    constructor() {
        window.addEventListener('select-coffee', (e: any) => {
            this.selectDrink(e.detail.item);
        }, false);

        window.addEventListener('select-dessert', (e: any) => {
            this.selectDessert(e.detail.item);
        }, false);

        window.addEventListener('highlight', (e: any) => {
            this.highlight(e.detail.item);
        }, false);

        window.addEventListener('go-to-next-step', () => {
            this.goToNextStep();
        }, false);

        window.addEventListener('go-to-prev-step', () => {
            this.goToPrevStep();
        }, false);

        window.addEventListener('finish-order', () => {
            this.finishOrder();
        }, false);
    }

    ngAfterViewInit() {
        this.stepper._getIndicatorType = () => 'number';
    }

    makeNewOrder() {
        this.orderDetails = ``;
        this.selectedDrink = '';
        this.selectedDessert = '';
        this.stepper.selectedIndex = 0;
    }

    selectDrink(drink) {
        this.selectedDrink = drink;
    }

    selectDessert(dessert) {
        this.selectedDessert = dessert;
    }

    finishOrder() {
        this.orderDetails = this.getOrderDetailsText();
    }

    getOrderDetailsText() {
        let text = 'You ordered: ';
        if (this.selectedDrink || this.selectedDessert) {
            text += this.selectedDrink + ((this.selectedDrink && this.selectedDessert) ? ' with ' : '') +
                this.selectedDessert + '. Enjoy your meal!';
        } else {
            text = 'Please choose something!';
        }

        return text;
    }

    highlight(item) {
        const el = document.getElementById(item);

        if (el) {
            el.classList.add('highlighted');
            setTimeout(() => {
                el.classList.remove('highlighted');
            }, 1000);
        }
    }

    goToNextStep() {
        if (this.stepper.selectedIndex < 2) {
            this.stepper.selectedIndex = this.stepper.selectedIndex + 1;
        }
    }

    goToPrevStep() {
        if (this.stepper.selectedIndex > 0) {
            this.stepper.selectedIndex = this.stepper.selectedIndex - 1;
        }
    }

    getImgPath(category, item) {
        return `../assets/${category}-${item.replace(' ', '-')}.jpg`;
    }
}
