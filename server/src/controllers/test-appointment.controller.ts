import {Count, CountSchema, Filter, repository, Where,} from '@loopback/repository';
import {
    del,
    get,
    getFilterSchemaFor,
    getModelSchemaRef,
    getWhereSchemaFor,
    param,
    patch,
    post,
    put,
    requestBody,
} from '@loopback/rest';
import {TestAppointment} from '../models';
import {TestAppointmentRepository, TestResultRepository} from '../repositories';
import {AppointmentType, TestActionEnum} from "../common/utils/enums";
import {service} from "@loopback/core";
import {HealthCenterService} from "../services/health-center.service";
import {AppointmentService} from "../services/appointment.service";

export class TestAppointmentController {

    protected DEFAULT_APPOINTMENT_TYPE = AppointmentType.AT_HEALTH_CENTER;

    constructor(
        @service('HealthCenterService') protected healthCenterService: HealthCenterService,
        @service('AppointmentService') protected appointmentService: AppointmentService,
        @repository(TestResultRepository) public testResultRepository: TestResultRepository,
        @repository(TestAppointmentRepository) public testAppointmentRepository: TestAppointmentRepository,
    ) {
    }

    @post('/test-appointments', {
        responses: {
            '200': {
                description: 'TestAppointment model instance',
                content: {'application/json': {schema: getModelSchemaRef(TestAppointment)}},
            },
        },
    })
    async create(
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(TestAppointment, {
                        title: 'NewTestAppointment',
                        exclude: ['id'],
                    }),
                },
            },
        })
            testAppointment: Omit<TestAppointment, 'id'>,
    ): Promise<TestAppointment> {

        let returnValue: Promise<TestAppointment> = new Promise(resolve => {
          this.testResultRepository.findOne({
            where: {patientId: testAppointment.patientId},
            order: ['created DESC']
          }, {strictObjectIDCoercion: true})
            .then(testResult => {
                switch (testResult?.action) {
                    case TestActionEnum.SCHEDULE_TEST_APPOINTMENT_AT_HEALTH_CENTER:
                        testAppointment.type = AppointmentType.AT_HEALTH_CENTER;
                        break;
                    case TestActionEnum.SCHEDULE_TEST_APPOINTMENT_AT_HOME:
                        testAppointment.type = AppointmentType.AT_HOME;
                        break;
                    default:
                        testAppointment.type = this.DEFAULT_APPOINTMENT_TYPE;
                        break;
                }
            })
            .catch(error => {
                testAppointment.type = this.DEFAULT_APPOINTMENT_TYPE;
            })
            .finally(() => {

                testAppointment.created = new Date();

                if (testAppointment.type == AppointmentType.AT_HEALTH_CENTER) {
                    this.healthCenterService.getPatientHealthCenter(testAppointment.patientId).then(healthCenter => {
                        testAppointment.healthCenterId = healthCenter?.id;
                        this.appointmentService.getAppointmentDateAtHealthCenter(testAppointment.patientId, testAppointment.healthCenterId).then(date => {
                            testAppointment.appointmentDate = date;
                            this.testAppointmentRepository.create(testAppointment).then(testAppointmentCreated => {
                                resolve(testAppointmentCreated);
                            })
                        });

                    })
                } else {
                    this.appointmentService.getAppointmentDateAtHome(testAppointment.patientId).then(date => {
                        testAppointment.appointmentDate = date;
                        this.testAppointmentRepository.create(testAppointment).then(testAppointmentCreated => {
                            resolve(testAppointmentCreated);
                        });
                    });
                }

            });

        });

        return returnValue;

    }

    @get('/test-appointments/count', {
        responses: {
            '200': {
                description: 'TestAppointment model count',
                content: {'application/json': {schema: CountSchema}},
            },
        },
    })
    async count(
        @param.query.object('where', getWhereSchemaFor(TestAppointment)) where?: Where<TestAppointment>,
    ): Promise<Count> {
        return this.testAppointmentRepository.count(where);
    }

    @get('/test-appointments', {
        responses: {
            '200': {
                description: 'Array of TestAppointment model instances',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: getModelSchemaRef(TestAppointment, {includeRelations: true}),
                        },
                    },
                },
            },
        },
    })
    async find(
        @param.query.object('filter', getFilterSchemaFor(TestAppointment)) filter?: Filter<TestAppointment>,
    ): Promise<TestAppointment[]> {
        return this.testAppointmentRepository.find(filter);
    }

    @patch('/test-appointments', {
        responses: {
            '200': {
                description: 'TestAppointment PATCH success count',
                content: {'application/json': {schema: CountSchema}},
            },
        },
    })
    async updateAll(
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(TestAppointment, {partial: true}),
                },
            },
        })
            testAppointment: TestAppointment,
        @param.query.object('where', getWhereSchemaFor(TestAppointment)) where?: Where<TestAppointment>,
    ): Promise<Count> {
        return this.testAppointmentRepository.updateAll(testAppointment, where);
    }

    @get('/test-appointments/{id}', {
        responses: {
            '200': {
                description: 'TestAppointment model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(TestAppointment, {includeRelations: true}),
                    },
                },
            },
        },
    })
    async findById(
        @param.path.string('id') id: string,
        @param.query.object('filter', getFilterSchemaFor(TestAppointment)) filter?: Filter<TestAppointment>
    ): Promise<TestAppointment> {
        return this.testAppointmentRepository.findById(id, filter);
    }

    @get('/test-appointments/patient-id/{patientId}', {
        responses: {
            '200': {
                description: 'TestAppointment model instance',
                content: {
                    'application/json': {
                        schema: getModelSchemaRef(TestAppointment, {includeRelations: true}),
                    },
                },
            },
        },
    })
    async findLatestByPatientId(
        @param.path.string('patientId') patientId: string
    ): Promise<TestAppointment | null> {
        return this.testAppointmentRepository.findOne({
            where: {patientId: patientId},
            include: [{relation: 'healthCenter'}],
            order: ['created DESC']
        }, {strictObjectIDCoercion: true});

    }

    @patch('/test-appointments/{id}', {
        responses: {
            '204': {
                description: 'TestAppointment PATCH success',
            },
        },
    })
    async updateById(
        @param.path.string('id') id: string,
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(TestAppointment, {partial: true}),
                },
            },
        })
            testAppointment: TestAppointment,
    ): Promise<void> {
        await this.testAppointmentRepository.updateById(id, testAppointment);
    }

    @put('/test-appointments/{id}', {
        responses: {
            '204': {
                description: 'TestAppointment PUT success',
            },
        },
    })
    async replaceById(
        @param.path.string('id') id: string,
        @requestBody() testAppointment: TestAppointment,
    ): Promise<void> {
        await this.testAppointmentRepository.replaceById(id, testAppointment);
    }

    @del('/test-appointments/{id}', {
        responses: {
            '204': {
                description: 'TestAppointment DELETE success',
            },
        },
    })
    async deleteById(@param.path.string('id') id: string): Promise<void> {
        await this.testAppointmentRepository.deleteById(id);
    }
}
