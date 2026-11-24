import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsUUID } from 'class-validator';
export class CreateMedicalRecordDto {
 @ApiProperty({description:'Synthetic patient UUID'}) @IsUUID() patientId!:string;
 @ApiProperty({description:'FHIR R4 resource (no subject required; hospital mapping supplied by server)'}) @IsObject() resource!:Record<string,unknown>;
}
