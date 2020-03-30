import {Component, Inject, LOCALE_ID, ViewChild} from '@angular/core';
import {PatientInfoFormComponent} from '../shared/patient-info-form/patient-info-form.component';
import {PatientService} from '../shared/services/patient.service';
import {Router} from '@angular/router';
import {Patient, PatientWithRelations} from '../shared/sdk';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {LoadingController} from '@ionic/angular';

@Component({
    selector: 'register',
    templateUrl: 'register.component.html',
    styleUrls: ['register.component.scss']
})
export class RegisterComponent {

    @ViewChild('patientInfoFormComponent', {static: true}) protected patientInfoFormComponent: PatientInfoFormComponent;

    protected patient: PatientWithRelations;
    public registerPatientForm: FormGroup;

    get acceptterms() { return this.registerPatientForm.get('acceptterms'); }

    protected accepttermsValuer: boolean;

    public formTriedToSubmit: boolean = false;

    constructor(protected formBuilder: FormBuilder,
                protected patientService: PatientService,
                @Inject(LOCALE_ID) protected locale: string,
                public loadingController: LoadingController,
                protected router: Router) {
        this.registerPatientForm = this.formBuilder.group({
            acceptterms: new FormControl(this.accepttermsValuer, [Validators.requiredTrue ])
        });
    }

    public onSubmit() {
        this.formTriedToSubmit = true;
        this.patientInfoFormComponent.validate();
        if(this.registerPatientForm.valid && this.patientInfoFormComponent.isValid) {
            this.register();
        }
    }

    async register() {

        if(this.patientInfoFormComponent.isValid) {

            const loading = await this.loadingController.create({
                message: this.locale=='es'?'Por favor, espere...':'Please wait ...'
            });
            await loading.present();

            this.patient = this.patientInfoFormComponent.patient;
            this.patientService.register(this.patient).subscribe(newPatient => {
                loading.dismiss();
                if(newPatient != null && newPatient != false) {
                    this.router.navigate(['/app/home']);
                }
                else {
                    //go to error page
                    this.router.navigate(['/no-access']);
                }
            })

        }
    }


}
